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

### Workspace left navigation (Finance domain)

The workspace area uses an app-shell layout: top bar + persistent **left navigation**. Each left-nav item corresponds to a workspace “service” screen.

- App shell + left navigation container: `src/ui/pages/WorkspaceLayoutPage.tsx`
  - Layout component used by the app shell: `src/ui/components/AppShell.tsx`
  - Settings dialog (opened by the top-right settings button): `src/ui/pages/WorkspaceSettingsDialog.tsx`

Screens (Finance):

- Income (`/workspaces/:workspaceId/income`) → `src/ui/pages/WorkspaceIncomePage.tsx`
- Expenses (`/workspaces/:workspaceId/expenses`) → `src/ui/pages/WorkspaceExpensesPage.tsx`
- State payments (`/workspaces/:workspaceId/state-payments`) → `src/ui/pages/WorkspaceStatePaymentsPage.tsx`
- Budget (`/workspaces/:workspaceId/budget`) → `src/ui/pages/WorkspaceBudgetEntriesPage.tsx`
- Summaries (`/workspaces/:workspaceId/summaries`) → `src/ui/pages/WorkspaceSummariesPage.tsx` (Month/Quarter tabs; JSON output)

For payload formats, see `../AutonomoControlApi/USAGES.md` (this is the source of truth for record schemas).

## Common workflows

- Create first workspace: open `/workspaces` → “Create” → fill `settings` (sent to `POST /workspaces`)
- Add income/expense/state payment/budget entry: open a workspace → use the “Add …” button (currently a no-op placeholder)
- View summaries: open a workspace → “Summaries” → Month/Quarter tabs load data from summaries endpoints

## Development notes

- Routes are defined in `AutonomoControlWeb/src/ui/app/AppRouter.tsx`.
- Auth logic lives in `AutonomoControlWeb/src/infrastructure/auth/cognitoHostedUi.ts` (PKCE + token exchange).
- API client lives in `AutonomoControlWeb/src/infrastructure/api/autonomoControlApi.ts`.
