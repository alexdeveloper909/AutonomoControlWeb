const getString = (key: keyof ImportMetaEnv): string | undefined => {
  const v = import.meta.env[key]
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

export const env = {
  appStage: getString('VITE_APP_STAGE') ?? 'dev',
  apiBaseUrl: getString('VITE_API_BASE_URL'),
  cognitoDomain: getString('VITE_COGNITO_DOMAIN'),
  cognitoClientId: getString('VITE_COGNITO_CLIENT_ID'),
  cognitoRedirectUri: getString('VITE_COGNITO_REDIRECT_URI'),
  cognitoLogoutUri: getString('VITE_COGNITO_LOGOUT_URI'),
  cognitoIdentityProvider: getString('VITE_COGNITO_IDENTITY_PROVIDER'),
} as const

export const requireEnv = (value: string | undefined, keyName: string): string => {
  if (!value) throw new Error(`Missing required env var: ${keyName}`)
  return value
}
