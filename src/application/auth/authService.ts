import type { AuthSession, AuthTokens } from '../../domain/auth'
import { decodeJwtClaims } from '../../infrastructure/auth/jwt'
import { buildAuthorizeUrl, buildLogoutUrl, exchangeCodeForTokens } from '../../infrastructure/auth/cognitoHostedUi'
import { tokenStorage } from '../../infrastructure/auth/tokenStorage'

const isExpired = (tokens: AuthTokens): boolean => {
  const now = Math.floor(Date.now() / 1000)
  return tokens.expiresAtEpochSeconds <= now + 30
}

const tokensToSession = (tokens: AuthTokens): AuthSession => {
  const claims = decodeJwtClaims(tokens.idToken)
  if (!claims.sub) throw new Error('Missing sub claim in id_token')
  return { tokens, user: { sub: claims.sub, email: claims.email } }
}

export const authService = {
  getSession(): AuthSession | null {
    const tokens = tokenStorage.read()
    if (!tokens) return null
    if (isExpired(tokens)) return null
    try {
      return tokensToSession(tokens)
    } catch {
      return null
    }
  },

  async startLogin(): Promise<void> {
    const url = await buildAuthorizeUrl()
    window.location.assign(url)
  },

  async finishLogin(params: { code: string; state: string }): Promise<AuthSession> {
    const tokens = await exchangeCodeForTokens(params)
    tokenStorage.write(tokens)
    return tokensToSession(tokens)
  },

  logout(): void {
    tokenStorage.clear()
    window.location.assign(buildLogoutUrl())
  },
}
