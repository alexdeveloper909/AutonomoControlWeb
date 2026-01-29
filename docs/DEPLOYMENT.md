# AutonomoControlWeb — Dev/Prod stacks + deployment notes

This project is designed to work with the dev/prod stages defined in `../AutonomoControlCDK/`.

## Dev vs prod

Dev and prod stacks are intentionally isolated:

- separate Cognito user pools (and therefore separate users)
- separate DynamoDB tables (stage-prefixed)
- separate API URLs

The web app selects a stage via Vite mode:

- `npm run dev:dev` → loads `.env.dev.local`
- `npm run dev:prod` → loads `.env.prod.local`

## Required CDK settings for the web app

From `../AutonomoControlCDK/README.md`:

- `OAuthCallbackUrls` must include `http://localhost:5173/auth/callback` for local dev
- `OAuthLogoutUrls` must include `http://localhost:5173/`
- `CorsAllowOrigins` must include `http://localhost:5173` (otherwise browser calls to the API will fail)

## Hosting (future)

The repo currently focuses on the MVP wiring and local dev. A typical AWS hosting path is:

- build with `npm run build:prod`
- host `dist/` in S3 behind CloudFront
- set the hosted site origin in `CorsAllowOrigins`
- set the hosted site callback/logout URLs in Cognito

If you want, we can extend `AutonomoControlCDK` with:

- an S3 bucket + CloudFront distribution for the web app
- stage outputs to generate the web `.env.*.local` automatically

## Hosting on GitHub Pages (prod + dev)

This repo supports deploying **two builds** to a single GitHub Pages site:

- **prod** at `https://<owner>.github.io/<repo>/`
- **dev** at `https://<owner>.github.io/<repo>/dev/`

Implementation notes:

- The GitHub Actions workflow builds twice (Vite `--mode prod` and `--mode dev`) and publishes a single Pages artifact with:
  - `out/` (prod)
  - `out/dev/` (dev)
- React Router uses `basename={import.meta.env.BASE_URL}` so each build works under its sub-path.
- GitHub Pages is static hosting (no rewrite rules). This repo includes a `404.html` redirect + an `index.html` bootstrap shim so deep links like `/workspaces/...` still load the SPA.

### Setup

1) Ensure your CDK stacks allow the hosted URLs (dev + prod) in Cognito and CORS:

- `OAuthCallbackUrls` must include:
  - `https://<owner>.github.io/<repo>/auth/callback`
  - `https://<owner>.github.io/<repo>/dev/auth/callback`
- `OAuthLogoutUrls` must include:
  - `https://<owner>.github.io/<repo>/`
  - `https://<owner>.github.io/<repo>/dev/`
- `CorsAllowOrigins` must include:
  - `https://<owner>.github.io`

2) In GitHub: `Settings → Pages → Build and deployment → Source: GitHub Actions`.

3) Configure **GitHub Actions Variables** (or Secrets) for the web app build.

In your GitHub repo: `Settings → Secrets and variables → Actions → Variables`, set:

**Prod**
- `PROD_VITE_API_BASE_URL` (e.g. `https://xxxx.execute-api.eu-west-1.amazonaws.com`)
- `PROD_VITE_COGNITO_DOMAIN` (include `https://`)
- `PROD_VITE_COGNITO_CLIENT_ID`
- `PROD_VITE_COGNITO_REDIRECT_URI` (e.g. `https://<owner>.github.io/<repo>/auth/callback`)
- `PROD_VITE_COGNITO_LOGOUT_URI` (e.g. `https://<owner>.github.io/<repo>/`)
- `PROD_VITE_COGNITO_IDENTITY_PROVIDER` (optional, e.g. `Google`)

**Dev**
- `DEV_VITE_API_BASE_URL`
- `DEV_VITE_COGNITO_DOMAIN` (include `https://`)
- `DEV_VITE_COGNITO_CLIENT_ID`
- `DEV_VITE_COGNITO_REDIRECT_URI` (e.g. `https://<owner>.github.io/<repo>/dev/auth/callback`)
- `DEV_VITE_COGNITO_LOGOUT_URI` (e.g. `https://<owner>.github.io/<repo>/dev/`)
- `DEV_VITE_COGNITO_IDENTITY_PROVIDER` (optional, e.g. `Google`)

Notes:
- This is a Vite app: these values are **compiled into the static build** (they are effectively public).
- If you prefer Secrets, you can switch the workflow to use `${{ secrets.NAME }}` instead of `${{ vars.NAME }}`.

4) Push to your default branch. The workflow at `AutonomoControlWeb/.github/workflows/pages.yml` deploys both builds.

### Notes

- The workflow assumes a **project site** base path of `/<repo>/`. If you use a custom domain (base path `/`), adjust the workflow `BASE` value.
