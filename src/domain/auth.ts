export type AuthTokens = {
  idToken: string
  accessToken: string
  refreshToken?: string
  expiresAtEpochSeconds: number
}

export type AuthUser = {
  sub: string
  email?: string
}

export type AuthSession = {
  tokens: AuthTokens
  user: AuthUser
}
