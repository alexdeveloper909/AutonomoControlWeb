# AutonomoControlWeb — Auth (Cognito Hosted UI + PKCE)

This app uses Cognito Hosted UI with Authorization Code + PKCE.

Code reference:

- `src/infrastructure/auth/cognitoHostedUi.ts`
- `src/application/auth/authService.ts`

## Required configuration

See `../AutonomoControlCDK/README.md` for the CDK parameters.

The web app needs:

- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_REDIRECT_URI` (must match CDK `OAuthCallbackUrls`)
- `VITE_COGNITO_LOGOUT_URI` (must match CDK `OAuthLogoutUrls`)
- Optional `VITE_COGNITO_IDENTITY_PROVIDER=Google`

## Flow

1) User clicks “Continue” on `/login`
2) App generates PKCE `code_verifier` + `code_challenge` and a random `state`
3) App redirects to:
   - `GET {COGNITO_DOMAIN}/oauth2/authorize?...`
4) Cognito redirects back to `/auth/callback?code=...&state=...`
5) App exchanges `code` for tokens at:
   - `POST {COGNITO_DOMAIN}/oauth2/token` (form-encoded)
6) App stores tokens in `localStorage`

## Token usage

- API calls send `Authorization: Bearer <id_token>` (matches API docs expectations)
- Tokens are stored in the browser (MVP); treat the app as a public client (no secrets)

## Session expiry UX (no refresh token renewal)

This MVP does **not** implement refresh-token based renewal / sliding sessions. When the `id_token` is expired (or about to expire) the UI prompts the user to sign in again.

Behavior:

- A session is treated as “about to expire” at `exp <= now + 30s` (same threshold as `authService.getSession()`).
- When that threshold is reached, a modal dialog is shown: “Session expired” with an **OK** button.
- The same modal is also shown when any API call returns `401` or `403`.
- Clicking **OK** clears stored tokens and redirects to `/login`.

Code reference:

- Timer + dialog + redirect: `src/ui/auth/SessionTimeoutProvider.tsx`
- Emitting “session expired” on HTTP 401/403: `src/infrastructure/http/jsonFetch.ts`
- Event bus: `src/infrastructure/auth/sessionEvents.ts`

## Logout

Logout clears local tokens and redirects to:

- `GET {COGNITO_DOMAIN}/logout?client_id=...&logout_uri=...`

## Common problems

### “Missing PKCE state (sessionStorage)”

- The callback was opened without starting login in the same browser session, or storage was cleared mid-flow.

### “OAuth state mismatch”

- Callback URL was reused, opened in another tab, or a stale `state` was returned.

### Token exchange failed (400/401)

Usually one of:

- `VITE_COGNITO_DOMAIN` is wrong (missing `https://` or wrong stage domain)
- `VITE_COGNITO_CLIENT_ID` does not match the stage’s app client
- `VITE_COGNITO_REDIRECT_URI` is not in the app client callback URLs
