# AutonomoControlWeb — AI-Assisted Browser Testing

This project can be tested end to end by an AI agent using a local browser, with a short manual handoff for Google sign-in.

The goal is to let the agent verify web changes in the real local app after implementation: start the Vite client, open the app, click through user flows, and report visible problems. Because authentication uses Cognito Hosted UI with Google, the user completes the Google login step manually.

## When to Use This

Use this flow after web UI changes that affect routes, forms, layout, auth redirects, navigation, data loading, or user-facing behavior.

It is especially useful for:

- Checking that the app starts with the current `.env.dev.local`.
- Verifying Cognito login returns to the app.
- Clicking through workspace navigation after a change.
- Confirming that forms, dialogs, filters, tabs, and tables render correctly.
- Reproducing bugs that are hard to see from static code review.

This is not a replacement for type-checking, linting, or automated tests. It is an interactive smoke test for real browser behavior.

## Safety Rules

- Only test against the local dev client, normally `npm run dev:dev`.
- Never print tokens, OAuth callback URLs with sensitive parameters, cookies, local storage values, or `.env.*.local` contents.
- The user must explicitly name which workspace is safe for testing.
- Do not open, edit, create records in, or delete anything from a workspace that was not approved by the user.
- For this developer's current dev data, `My workspace test` is the approved test workspace. `TaxYear2026` is real production-use data and must not be touched.
- Prefer non-destructive navigation first. Only create, edit, or delete records if the user explicitly asks for a mutation test.
- If mutation testing is needed, use clearly disposable test data and stay inside the approved test workspace.
- Stop and ask the user if the browser is on an unexpected account, workspace, stage, or data set.

## Standard Flow

1. Start the local web client:

   ```sh
   npm run dev:dev
   ```

2. Open the local app, usually:

   ```text
   http://localhost:5173/
   ```

3. Verify the public landing page and `/login` page render.

4. Click `Continue with Google` to start the Cognito Hosted UI flow.

5. Hand control to the user. The user signs in with Google and waits until the app returns to `/workspaces`.

6. After the user says the login is done, the agent takes control again and verifies:

   - The app is back on `localhost`.
   - The workspace list is visible.
   - The approved test workspace is present.
   - Any non-approved workspace is avoided.

7. Enter only the approved workspace and run the agreed checks.

8. Report what was tested, what passed, what looked suspicious, and whether any data was changed.

## Suggested Smoke Test

For a non-destructive pass, click through:

- Landing page → Login page.
- Login redirect handoff → Workspaces page.
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

The agent should not try to automate the Google account login itself. Google may require MFA, passkeys, captcha, account selection, or other protected flows. The user should complete this step manually in the controlled browser.

After sign-in, the agent can continue using the authenticated browser session for local app testing.

## Long-Term Automation Option

For fully repeatable automated tests, add a dedicated e2e strategy that avoids real Google login, such as:

- A dev-only test auth mode.
- Playwright with saved authenticated storage state.
- Mocked auth and mocked API responses for UI-only tests.
- A dedicated Cognito test user flow if the backend needs to be exercised.

Keep real user credentials, OAuth tokens, and local env secrets out of git and chat.
