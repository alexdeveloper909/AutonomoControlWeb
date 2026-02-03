# AutonomoControlWeb — Troubleshooting

## Login loops back to /login

Likely causes:

- Callback URL mismatch: `VITE_COGNITO_REDIRECT_URI` not listed in CDK `OAuthCallbackUrls`
- Wrong stage: using dev env vars against prod (or vice versa)

Check:

- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_REDIRECT_URI`

## “Missing PKCE state (sessionStorage)”

- Start login from `/login` and complete the flow in the same tab/session.
- Avoid opening the callback URL directly.

## “Missing OAuth callback params (code/state)” (often on GitHub Pages / mobile)

This usually means the OAuth provider returned the callback parameters via **POST** (`response_mode=form_post`), which is not compatible with static hosting deep-link shims.

Fix:

- Ensure the authorize request uses `response_mode=query` (this repo sets it in `src/infrastructure/auth/cognitoHostedUi.ts`).
- Verify the app client / Hosted UI config is not forcing `form_post`.

## API calls fail with CORS in the browser console

Fix the CDK stack config:

- `CorsAllowOrigins` must include your website origin (for local dev: `http://localhost:5173`)

Then redeploy the stack.

## API calls fail with 401/403

401:

- token missing/invalid
- calling an endpoint without going through `/login`

403:

- user is not a workspace member (membership checks are enforced by the API)

See:

- `../AutonomoControlApi/README.md`
- `../AutonomoControlApi/USAGES.md`
