# Internationalization (i18n) + Language Preference

This document describes how the AutonomoControl web app handles UI translations and the per-user language preference.

## Goals

- Support these UI languages: `en`, `es`, `uk`, `ar`, `ro`.
- On a user’s first login (when they don’t yet have a stored preference), prompt them to confirm a language.
- Default the prompt to a best-effort match of browser language → supported language.
- Persist the choice in DynamoDB (users table) so subsequent logins load the preferred language automatically.
- Allow users to change language later in **User settings**.
- Support RTL layout for Arabic (`ar`).

## High-level user flow

1. User logs in via Cognito Hosted UI.
2. After session is established, the UI calls `GET /users/me`.
3. If the response contains `preferredLanguage`:
   - The UI switches to that language.
4. If `preferredLanguage` is missing/null:
   - The UI shows a blocking language confirmation dialog.
   - The initial selection is derived from the browser default language (mapped to supported set).
   - When the user confirms, the UI saves it via `PUT /users/me` and keeps using that language.
5. On any later visit, the user can open **User settings** (user icon in the top app bar) to change language.

## Supported languages and RTL

- Supported set is hard-coded as: `en | es | uk | ar | ro`.
- Arabic (`ar`) is treated as `rtl`; all others are `ltr`.
- The app updates:
  - MUI theme `direction`
  - `document.documentElement.dir` and `document.documentElement.lang`
  - Emotion cache uses `stylis-plugin-rtl` when `rtl` is active

## Browser language mapping

Language detection uses the browser language list (in order):

1. `navigator.languages` (preferred list)
2. `navigator.language` (fallback)

Normalization rules:

- Lowercase
- Replace `_` with `-`
- Take the primary subtag (e.g. `es-ES` → `es`)
- Use it only if it’s in the supported set

If no supported language matches, fallback is `en`.

## Persistence model (API + DynamoDB)

### API endpoints

- `GET /users/me`
  - Returns current user identity + settings
  - Includes `preferredLanguage` when present

- `PUT /users/me`
  - Request body:
    ```json
    { "preferredLanguage": "en" }
    ```
  - Valid values: `en`, `es`, `uk`, `ar`, `ro`
  - Returns the updated `UserMe` payload

### DynamoDB storage

- Table: `<prefix>-users` (aka “users table”; provisioned by CDK)
- PK: `user_id`
- Field used for this feature: `preferred_language` (string, lowercased)

Notes:

- The `users` row is also created/ensured by a Cognito trigger (`ensure-user-on-login`), but the language preference is set via the API.
- The API implementation uses DynamoDB `UpdateItem` (upsert semantics) so setting language works even if a user row is missing.

## Web implementation details

### Main pieces (web)

- i18n bootstrap and resources:
  - `AutonomoControlWeb/src/ui/i18n/i18n.ts`
  - `AutonomoControlWeb/src/ui/i18n/resources.ts`

- Supported languages + browser mapping:
  - `AutonomoControlWeb/src/domain/language.ts`
  - `AutonomoControlWeb/src/ui/i18n/supportedLanguages.ts`

- Language prompt + settings dialog orchestration:
  - `AutonomoControlWeb/src/ui/user/UserSettingsProvider.tsx`

- User settings dialog:
  - `AutonomoControlWeb/src/ui/user/UserSettingsDialog.tsx`

- First-login “confirm language” dialog:
  - `AutonomoControlWeb/src/ui/user/LanguageConfirmDialog.tsx`

- API client calls:
  - `AutonomoControlWeb/src/infrastructure/api/autonomoControlApi.ts`

### How the provider decides what to show

The provider runs only after a user is authenticated (it has access to the ID token).

1. Fetches `GET /users/me`.
2. If `preferredLanguage` exists:
   - Switch language to it.
   - Do not show the confirm dialog.
3. If `preferredLanguage` is missing/null:
   - Determine `initialLanguage` from browser (mapped to supported set), otherwise keep current i18n language.
   - Switch UI to that initial language.
   - Show the confirm dialog (blocking) to let the user explicitly confirm or choose a different language.
4. On confirm:
   - Persist the language (`PUT /users/me`)
   - Keep UI language in sync with the persisted value.

### “Remember” behavior

- Source of truth after the first save is DynamoDB via `GET /users/me`.
- The web app also has a small local `languageStorage` to avoid showing English between reload and `GET /users/me` completing.
  - This is a convenience cache; it is overridden by the server preference when present.

## Backend implementation details

- Controller:
  - `AutonomoControlApi/app/src/main/kotlin/autonomo/controller/UsersController.kt`
- Service:
  - `AutonomoControlApi/app/src/main/kotlin/autonomo/service/UsersService.kt`
- Repository:
  - `AutonomoControlApi/app/src/main/kotlin/autonomo/repository/UsersRepository.kt`
- Routing:
  - `AutonomoControlApi/app/src/main/kotlin/autonomo/handler/RecordsLambda.kt`
- CDK routes:
  - `AutonomoControlCDK/lib/autonomo_control_cdk-stack.ts`

## Error handling and edge cases

- If `GET /users/me` fails (network/CORS/401/403):
  - Session expiry UX is handled centrally by `SessionTimeoutProvider`.
  - The language prompt may not appear because user settings can’t be loaded; the UI stays on the current language.
- If `PUT /users/me` fails:
  - The confirm dialog stays open and shows an error, allowing retry.
- If the server returns an unsupported language value (unexpected):
  - The client treats it as `null` and falls back to the supported logic.

## Manual verification checklist

1. First login with a new user:
   - Expect language confirm dialog to show.
   - Change language and confirm → UI switches and persists.
2. Logout + login again:
   - Confirm dialog should not show.
   - UI should load preferred language automatically.
3. Open User settings:
   - Change language and save → UI switches and persists.
4. Switch to Arabic:
   - UI becomes RTL (layout direction, alignment, etc.).

