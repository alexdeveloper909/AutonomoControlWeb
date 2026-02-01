/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_STAGE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_COGNITO_DOMAIN?: string
  readonly VITE_COGNITO_CLIENT_ID?: string
  readonly VITE_COGNITO_REDIRECT_URI?: string
  readonly VITE_COGNITO_LOGOUT_URI?: string
  readonly VITE_COGNITO_IDENTITY_PROVIDER?: string

  // Sentry (optional)
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_RELEASE?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
  readonly VITE_SENTRY_ENABLE_LOGS?: string
  readonly VITE_SENTRY_ENABLE_METRICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
