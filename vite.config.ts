import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(() => {
  // Only generate (and upload) sourcemaps when Sentry build credentials are present.
  // This avoids deploying `*.map` files to GitHub Pages by accident.
  const enableSentrySourcemaps = Boolean(
    process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
  )

  return {
    build: {
      sourcemap: enableSentrySourcemaps ? 'hidden' : false,
    },
    plugins: [
      react(),
      ...(enableSentrySourcemaps
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG!,
              project: process.env.SENTRY_PROJECT!,
              authToken: process.env.SENTRY_AUTH_TOKEN!,
              ...(process.env.SENTRY_RELEASE ? { release: { name: process.env.SENTRY_RELEASE } } : {}),
              sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
            }),
          ]
        : []),
    ],
  }
})
