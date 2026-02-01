# AutonomoControlWeb

React + TypeScript web client for the AutonomoControl system.

- UI: React + MUI (Material UI): https://mui.com/material-ui/getting-started/
- Auth: Cognito Hosted UI (Authorization Code + PKCE)
- API calls: `Authorization: Bearer <id_token>` (see `../AutonomoControlApi/README.md`)

Related overview: `../project_overview.md`

## Documentation map

- Setup + usage: `AutonomoControlWeb/README.md`
- Architecture: `AutonomoControlWeb/docs/ARCHITECTURE.md`
- UI design + theming guidelines: `AutonomoControlWeb/docs/DESIGN.md`
- Auth (Hosted UI + PKCE): `AutonomoControlWeb/docs/AUTH.md`
- API integration (endpoints + payloads): `AutonomoControlWeb/docs/API.md`
- Dev/prod stacks + web hosting notes: `AutonomoControlWeb/docs/DEPLOYMENT.md`
- Troubleshooting: `AutonomoControlWeb/docs/TROUBLESHOOTING.md`

## Architecture (layered)

Code is organized by layers under `src/`:

- `src/domain/` — pure TypeScript types (no React)
- `src/application/` — use-cases (login/logout/callback)
- `src/infrastructure/` — adapters (Cognito Hosted UI, token storage, HTTP/API client)
- `src/ui/` — React components and pages

## Prerequisites

- Node.js (use the version you use for other TypeScript projects in this repo)
- A deployed CDK stack (dev or prod) providing Cognito + API Gateway:
  - See `../AutonomoControlCDK/README.md`

## Configure dev/prod stacks (AWS)

This app is designed to run against **dev** and **prod** CDK stacks (separate Cognito + API per stage).

1) Copy an example file into a local env file (these are gitignored via `*.local`):

- `cp .env.dev.example .env.dev.local`
- `cp .env.prod.example .env.prod.local`

2) Fill in values from `AutonomoControlCDK` deployment outputs:

- `VITE_API_BASE_URL` ← `ApiUrl`
- `VITE_COGNITO_DOMAIN` ← `CognitoDomain` (include `https://`)
- `VITE_COGNITO_CLIENT_ID` ← `CognitoUserPoolClientId`
- `VITE_COGNITO_REDIRECT_URI` should match the CDK `OAuthCallbackUrls` (e.g. `http://localhost:5173/auth/callback`)
- `VITE_COGNITO_LOGOUT_URI` should match the CDK `OAuthLogoutUrls` (e.g. `http://localhost:5173/`)
- `VITE_COGNITO_IDENTITY_PROVIDER=Google` (optional; omit to show the generic Hosted UI)

If Google IdP isn’t enabled yet, follow `../AutonomoControlCDK/README.md` (“Cognito User Pool + Google IdP”).

### Env var reference

Vite loads env per mode. For example `vite --mode dev` loads, in order:

- `.env`
- `.env.local`
- `.env.dev`
- `.env.dev.local`

This project uses `.env.dev.local` and `.env.prod.local` to keep stage-specific settings out of git.

- `VITE_APP_STAGE`: `dev` | `prod` (informational; used in UI)
- `VITE_API_BASE_URL`: API Gateway base URL, e.g. `https://xxxx.execute-api.eu-west-1.amazonaws.com`
- `VITE_COGNITO_DOMAIN`: Cognito domain base, e.g. `https://autonomo-control-dev-<acct>.auth.eu-west-1.amazoncognito.com`
- `VITE_COGNITO_CLIENT_ID`: Cognito User Pool App Client id
- `VITE_COGNITO_REDIRECT_URI`: must match `OAuthCallbackUrls` in CDK
- `VITE_COGNITO_LOGOUT_URI`: must match `OAuthLogoutUrls` in CDK
- `VITE_COGNITO_IDENTITY_PROVIDER`: optional (set to `Google` to jump straight to Google in Hosted UI)

## Local development

```sh
npm install
npm run dev:dev
```

Run against the prod stack locally (still on localhost, just a different Cognito/API):

```sh
npm run dev:prod
```

Type-check (requested MVP gate):

```sh
tsc --noEmit
```

## MVP screens

- `/login` → starts Cognito Hosted UI login (Google if configured)
- `/workspaces` → list/create workspaces (POST `/workspaces`)
- `/workspaces/:workspaceId` → workspace area with app shell + **left navigation** (services grouped by domain)

## Internationalization (i18n) + language preference

The web app supports UI translations and persists a per-user language preference.

Supported languages:

- English (`en`)
- Spanish (`es`)
- Ukrainian (`uk`)
- Arabic (`ar`) — RTL layout is enabled automatically
- Romanian (`ro`)

Feature documentation:

- `AutonomoControlWeb/docs/feature/i18n-language-preference.md`

### Workspace left navigation (Finance domain)

The workspace area uses an app-shell layout: top bar + persistent **left navigation**. Each left-nav item corresponds to a workspace “service” screen.

- App shell + left navigation container: `src/ui/pages/WorkspaceLayoutPage.tsx`
  - Layout component used by the app shell: `src/ui/components/AppShell.tsx`
  - Settings dialog (opened by the top-right settings button): `src/ui/pages/WorkspaceSettingsDialog.tsx`

Screens (Finance):

- Income (`/workspaces/:workspaceId/income`) → `src/ui/pages/WorkspaceIncomePage.tsx` (year filter; paginated, sorted by `eventDate` desc)
  - Add income (`/workspaces/:workspaceId/income/new`) → `src/ui/pages/WorkspaceIncomeCreatePage.tsx` (creates an `INVOICE` record)
- Expenses (`/workspaces/:workspaceId/expenses`) → `src/ui/pages/WorkspaceExpensesPage.tsx` (year filter; paginated, sorted by `eventDate` desc)
  - Add expense (`/workspaces/:workspaceId/expenses/new`) → `src/ui/pages/WorkspaceExpensesCreatePage.tsx` (creates an `EXPENSE` record)
- State payments (`/workspaces/:workspaceId/state-payments`) → `src/ui/pages/WorkspaceStatePaymentsPage.tsx` (year filter; paginated, sorted by `eventDate` desc)
  - Add state payment (`/workspaces/:workspaceId/state-payments/new`) → `src/ui/pages/WorkspaceStatePaymentsCreatePage.tsx` (creates a `STATE_PAYMENT` record)
- Transfers (`/workspaces/:workspaceId/transfers`) → `src/ui/pages/WorkspaceTransfersPage.tsx` (year filter; paginated, sorted by `eventDate` desc)
  - Add transfer (`/workspaces/:workspaceId/transfers/new`) → `src/ui/pages/WorkspaceTransfersCreatePage.tsx` (creates a `TRANSFER` record)
- Budget (`/workspaces/:workspaceId/budget`) → `src/ui/pages/WorkspaceBudgetEntriesPage.tsx` (year filter; paginated, sorted by `eventDate` desc)
  - Add budget entry (`/workspaces/:workspaceId/budget/new`) → `src/ui/pages/WorkspaceBudgetCreatePage.tsx` (creates a `BUDGET` record)
- Summaries (`/workspaces/:workspaceId/summaries`) → `src/ui/pages/WorkspaceSummariesPage.tsx` (Month/Quarter tabs; table view + details dialog; optional raw JSON; month table includes “Can spend (no expenses)” column)

For payload formats, see `../AutonomoControlApi/USAGES.md` (this is the source of truth for record schemas).

## Common workflows

- Create first workspace: open `/workspaces` → “Create” → fill `settings` (sent to `POST /workspaces`)
- Add income: open a workspace → Income → “Add Income” → fill the form → Create (sends `POST /workspaces/{workspaceId}/records` with `recordType=INVOICE`)
- Add expense: open a workspace → Expenses → “Add Expense” → fill the form → Create (sends `POST /workspaces/{workspaceId}/records` with `recordType=EXPENSE`)
- Add state payment: open a workspace → State payments → “Add State Payment” → fill the form → Create (sends `POST /workspaces/{workspaceId}/records` with `recordType=STATE_PAYMENT`)
- Add transfer: open a workspace → Transfers → “Add Transfer” → fill the form → Create (sends `POST /workspaces/{workspaceId}/records` with `recordType=TRANSFER`)
- Add budget entry: open a workspace → Budget → “Add Budget Entry” → fill the form → Create (sends `POST /workspaces/{workspaceId}/records` with `recordType=BUDGET`)
- View summaries: open a workspace → “Summaries” → Month/Quarter tabs show tables; click a row for full details; “Show raw JSON” toggles debug output

## Development notes

- Routes are defined in `AutonomoControlWeb/src/ui/app/AppRouter.tsx`.
- Auth logic lives in `AutonomoControlWeb/src/infrastructure/auth/cognitoHostedUi.ts` (PKCE + token exchange).
- Session expiry UX (no refresh token renewal) is handled by `AutonomoControlWeb/src/ui/auth/SessionTimeoutProvider.tsx`.
- API client lives in `AutonomoControlWeb/src/infrastructure/api/autonomoControlApi.ts`.

## Client-side caching (TanStack Query)

The Finance left-navigation tabs (Income, Expenses, State payments, Transfers, Budget, Summaries) use TanStack Query
to cache API responses and avoid refetching when switching between tabs.

- Query client setup: `src/ui/app/queryClient.ts`
- Query keys: `src/ui/queries/queryKeys.ts`

Caching behavior:

- Record lists are cached per `workspaceId` + `recordType` + `year`.
- Summaries are cached per `workspaceId`.
- Queries default to `staleTime=Infinity` (no automatic refetch on tab switch); the UI “Refresh” buttons clear cache for the current view.

Cache invalidation on create:

- After creating `INVOICE`, `EXPENSE`, or `STATE_PAYMENT`:
  - Invalidate that record list cache.
  - Invalidate `Summaries` cache.
- After creating `TRANSFER` or `BUDGET`:
  - Invalidate that record list cache.
  - Do **not** invalidate `Summaries` cache (these features do not affect summaries).
