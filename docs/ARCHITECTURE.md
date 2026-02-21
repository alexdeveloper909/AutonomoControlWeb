# AutonomoControlWeb — Architecture

This web client follows a simple layered structure intended to keep business logic testable and UI code thin.

Source of truth for overall system behavior:

- `../project_overview.md`
- `../AutonomoControlApi/README.md`
- `../AutonomoControlApi/USAGES.md`
- `../AutonomoControlCore/PROJECT_OVERVIEW.md`

## Layers

### `src/domain/` (pure TypeScript)

Contains project types and “vocabulary” used across the app:

- Auth session + tokens: `src/domain/auth.ts`
- Workspace + settings + record types: `src/domain/workspace.ts`, `src/domain/settings.ts`, `src/domain/records.ts`

Rules:

- No React imports
- No browser APIs
- No networking

### `src/application/` (use-cases)

Coordinates domain + infrastructure to implement user flows:

- Login / callback / logout: `src/application/auth/authService.ts`

Rules:

- No React imports
- Calls into `src/infrastructure/*`

### `src/infrastructure/` (adapters)

Integrations with the outside world:

- Env reading: `src/infrastructure/config/env.ts`
- Cognito Hosted UI + PKCE: `src/infrastructure/auth/*`
- HTTP utilities: `src/infrastructure/http/*`
- API client: `src/infrastructure/api/autonomoControlApi.ts`

Rules:

- No React imports
- Prefer small, replaceable modules (e.g., `jsonFetch` + an API wrapper)

### `src/ui/` (React)

All MUI + React Router UI code:

- App shell + theme: `src/ui/app/*`
- Auth context: `src/ui/auth/*`
- Pages: `src/ui/pages/*`

Data fetching + caching:

- The app uses TanStack Query (React Query) to cache API responses and make left-nav tab switches instant.
- Query client setup: `src/ui/app/queryClient.ts`
- Query keys: `src/ui/queries/queryKeys.ts`
- Default policy: `staleTime=Infinity` (no auto-refetch on tab switch); “Refresh” buttons clear cache for that view.
- Invalidation rules on record creation are documented in `AutonomoControlWeb/README.md` (“Client-side caching”).

## Routing

- Router definition: `src/ui/app/AppRouter.tsx`
- Protected routes: `src/ui/auth/RequireAuth.tsx`

## Auth + API integration boundaries

- Auth concerns are isolated to `src/infrastructure/auth/*` and `src/application/auth/*`.
- API calls are centralized in `src/infrastructure/api/autonomoControlApi.ts`.
- UI only consumes the API client; it does not build URLs or headers directly.

## Why a “raw JSON payload” MVP?

The API supports multiple record types with non-trivial payload schemas (Invoice/Expense/Transfer/RegularSpending/etc). The MVP
uses a JSON editor to:

- validate end-to-end auth + CORS + API wiring quickly
- avoid committing to forms before schemas stabilize

The next iteration should replace JSON editors with typed forms per record type.
