const getString = (key: keyof ImportMetaEnv): string | undefined => {
  const v = import.meta.env[key]
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const getBool = (key: keyof ImportMetaEnv): boolean | undefined => {
  const v = getString(key)
  if (!v) return undefined
  const lc = v.toLowerCase()
  if (lc === '1' || lc === 'true' || lc === 'yes' || lc === 'on') return true
  if (lc === '0' || lc === 'false' || lc === 'no' || lc === 'off') return false
  return undefined
}

const getNumber = (key: keyof ImportMetaEnv): number | undefined => {
  const v = getString(key)
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

const sentryDsn = getString('VITE_SENTRY_DSN')

export const env = {
  appStage: getString('VITE_APP_STAGE') ?? 'dev',
  apiBaseUrl: getString('VITE_API_BASE_URL'),
  cognitoDomain: getString('VITE_COGNITO_DOMAIN'),
  cognitoClientId: getString('VITE_COGNITO_CLIENT_ID'),
  cognitoRedirectUri: getString('VITE_COGNITO_REDIRECT_URI'),
  cognitoLogoutUri: getString('VITE_COGNITO_LOGOUT_URI'),
  cognitoIdentityProvider: getString('VITE_COGNITO_IDENTITY_PROVIDER'),

  // Sentry (optional)
  sentryDsn,
  sentryEnvironment: getString('VITE_SENTRY_ENVIRONMENT'),
  sentryRelease: getString('VITE_SENTRY_RELEASE'),
  sentryTracesSampleRate: getNumber('VITE_SENTRY_TRACES_SAMPLE_RATE'),
  sentryEnableLogs: getBool('VITE_SENTRY_ENABLE_LOGS') ?? Boolean(sentryDsn),
  sentryEnableMetrics: getBool('VITE_SENTRY_ENABLE_METRICS') ?? Boolean(sentryDsn),
} as const

export const requireEnv = (value: string | undefined, keyName: string): string => {
  if (!value) throw new Error(`Missing required env var: ${keyName}`)
  return value
}
