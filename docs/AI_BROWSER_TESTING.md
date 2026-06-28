# AutonomoControlWeb — AI-Assisted Browser Testing

This project can be tested end to end by an AI agent using a local browser and a dedicated dev Cognito test user.

The goal is to let the agent verify web changes in the real local app after implementation: start the Vite client, open the app, bootstrap a real authenticated Cognito session, click through user flows, and report visible problems. The AI flow does not automate Google sign-in.

## When to Use This

Use this flow after web UI changes that affect routes, forms, layout, auth redirects, navigation, data loading, or user-facing behavior.

It is especially useful for:

- Checking that the app starts with the current `.env.dev.local`.
- Verifying authenticated app behavior without a manual Google handoff.
- Clicking through workspace navigation after a change.
- Confirming that forms, dialogs, filters, tabs, and tables render correctly.
- Reproducing bugs that are hard to see from static code review.

This is not a replacement for type-checking, linting, or automated tests. It is an interactive smoke test for real browser behavior.

## Safety Rules

- Only test against the local dev client, normally `npm run dev:e2e` for AI browser testing.
- Never print tokens, OAuth callback URLs with sensitive parameters, cookies, local storage values, or `.env.*.local` contents.
- The user must explicitly name which workspace is safe for testing.
- Do not open, edit, create records in, or delete anything from a workspace that was not approved by the user.
- For this developer's current dev data, `My workspace test` is the approved test workspace. `TaxYear2026` is real production-use data and must not be touched.
- Prefer non-destructive navigation first. Only create, edit, or delete records if the user explicitly asks for a mutation test.
- If mutation testing is needed, use clearly disposable test data and stay inside the approved test workspace.
- Stop and ask the user if the browser is on an unexpected account, workspace, stage, or data set.

## One-Time Setup

1. Deploy the dev CDK stack version that enables `USER_PASSWORD_AUTH` on the dev Cognito web app client.

2. Create a local e2e env file:

   ```sh
   cp .env.e2e.example .env.e2e.local
   ```

3. Fill in `.env.e2e.local`:

   - `E2E_COGNITO_USER_POOL_ID` from the dev CDK output.
   - `E2E_TEST_USER_EMAIL` for the dedicated dev Cognito test user.
   - `E2E_TEST_USER_PASSWORD` for that user.
   - `E2E_WORKSPACE_ID=83e079dc-9385-47e5-bef2-56f349b36acd` for `My workspace test`.
   - `E2E_WORKSPACE_MEMBERS_TABLE`, normally `autonomo-control-dev-workspace_members`.

4. Ensure the test user exists and has membership in the approved test workspace:

   ```sh
   npm run e2e:grant-workspace
   ```

The grant script creates/updates the Cognito user, sets a permanent password, and writes a `USER#<sub>` membership row for the configured workspace.

## Standard AI Flow

1. Start the local web client:

   ```sh
   npm run dev:e2e
   ```

2. Wait for Vite to report that the dev server is ready.

3. Open the e2e bootstrap URL:

   ```text
   http://localhost:5173/__e2e__/auth
   ```

4. The bootstrap page writes the real Cognito tokens to the same `localStorage` key used by normal auth and redirects to `/workspaces`.

5. Verify:

   - The app is back on `localhost`.
   - The workspace list is visible.
   - The approved test workspace is present.
   - Any non-approved workspace is avoided.

6. Enter only the approved workspace and run the agreed checks.

7. Report what was tested, what passed, what looked suspicious, and whether any data was changed.

## Suggested Smoke Test

For a non-destructive pass, click through:

- E2E auth bootstrap → Workspaces page.
- Approved workspace only.
- Income.
- Expenses.
- State payments.
- Summaries, including Month summaries, Quarter summaries, Renta estimate, and IVA estimate tabs.
- Balance.
- Budget.
- Regular spendings dashboard.
- Regular spendings list.

Do not click `Add`, `Create`, `Edit`, `Delete`, `Sign out`, workspace settings, or three-dot action menus unless they are part of the requested test.

## Browser Testing Notes

The app uses React Router and TanStack Query. Immediately after clicking a navigation item, a screenshot can briefly show the previous screen while the URL has already changed. Treat a follow-up browser snapshot after the route settles as the source of truth.

Recommended agent pattern:

1. Click the link or button.
2. Wait for the URL and/or page content to settle.
3. Take a fresh accessibility snapshot.
4. Evaluate the final snapshot, not only the instant click screenshot.

## Google Sign-In Boundary

The agent should not try to automate the Google account login itself. Google may require MFA, passkeys, captcha, account selection, or other protected flows.

For AI browser testing, use `npm run dev:e2e` and `http://localhost:5173/__e2e__/auth` instead. Manual Google login should be a fallback only when specifically requested.

## Implementation Notes

- `npm run dev:e2e` obtains fresh Cognito tokens for the configured test user and starts Vite with temporary `VITE_E2E_*` env values.
- `/__e2e__/auth` is guarded client-side: it only works when explicitly enabled, not in `prod`, and only on localhost.
- The token payload is not printed. Do not read or expose `.env.e2e.local`, terminal process environments, browser storage, or callback URLs containing credentials/tokens.

## Other Automation Options

For faster UI-only regression tests, a future mocked API/auth mode can still be useful. It should complement this real dev API e2e flow, not replace it.

Keep real user credentials, OAuth tokens, and local env secrets out of git and chat.
