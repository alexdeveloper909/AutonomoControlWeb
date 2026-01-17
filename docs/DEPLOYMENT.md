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

