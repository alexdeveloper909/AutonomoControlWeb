import type { AuthTokens } from '../../domain/auth'
import { env, requireEnv } from '../config/env'
import { decodeJwtClaims } from './jwt'
import { randomString, sha256Base64Url } from './pkce'
import { jsonFetch } from '../http/jsonFetch'

const PKCE_STORAGE_KEY = 'autonomoControl.pkce'

type PkceState = {
  state: string
  codeVerifier: string
}

const storePkce = (pkce: PkceState): void => {
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkce))
}

const readPkce = (): PkceState | null => {
  const raw = sessionStorage.getItem(PKCE_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PkceState
  } catch {
    return null
  }
}

const clearPkce = (): void => {
  sessionStorage.removeItem(PKCE_STORAGE_KEY)
}

export const buildAuthorizeUrl = async (): Promise<string> => {
  const cognitoDomain = requireEnv(env.cognitoDomain, 'VITE_COGNITO_DOMAIN')
  const clientId = requireEnv(env.cognitoClientId, 'VITE_COGNITO_CLIENT_ID')
  const redirectUri = requireEnv(env.cognitoRedirectUri, 'VITE_COGNITO_REDIRECT_URI')

  const state = randomString(16)
  const codeVerifier = randomString(32)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  storePkce({ state, codeVerifier })

  const url = new URL('/oauth2/authorize', cognitoDomain)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  // Force query params in the callback (code/state in URL) instead of form_post.
  // Static hosting (e.g. GitHub Pages) can't reliably support POST callbacks.
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('code_challenge', codeChallenge)

  const identityProvider = env.cognitoIdentityProvider
  if (identityProvider) url.searchParams.set('identity_provider', identityProvider)

  return url.toString()
}

type TokenEndpointResponse = {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export const exchangeCodeForTokens = async (params: {
  code: string
  state: string
}): Promise<AuthTokens> => {
  const cognitoDomain = requireEnv(env.cognitoDomain, 'VITE_COGNITO_DOMAIN')
  const clientId = requireEnv(env.cognitoClientId, 'VITE_COGNITO_CLIENT_ID')
  const redirectUri = requireEnv(env.cognitoRedirectUri, 'VITE_COGNITO_REDIRECT_URI')

  const pkce = readPkce()
  if (!pkce) throw new Error('Missing PKCE state (sessionStorage)')
  if (pkce.state !== params.state) throw new Error('OAuth state mismatch')

  const tokenUrl = new URL('/oauth2/token', cognitoDomain).toString()
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('client_id', clientId)
  body.set('code', params.code)
  body.set('redirect_uri', redirectUri)
  body.set('code_verifier', pkce.codeVerifier)

  // Cognito requires form-encoded token requests.
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => undefined)
    throw new Error(`Token exchange failed (${res.status}): ${text ?? ''}`)
  }
  const data = (await res.json()) as TokenEndpointResponse

  const claims = decodeJwtClaims(data.id_token)
  const exp = claims.exp
  if (!exp) throw new Error('Missing exp claim in id_token')

  clearPkce()
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAtEpochSeconds: exp,
  }
}

export const buildLogoutUrl = (): string => {
  const cognitoDomain = requireEnv(env.cognitoDomain, 'VITE_COGNITO_DOMAIN')
  const clientId = requireEnv(env.cognitoClientId, 'VITE_COGNITO_CLIENT_ID')
  const logoutUri = requireEnv(env.cognitoLogoutUri, 'VITE_COGNITO_LOGOUT_URI')

  const url = new URL('/logout', cognitoDomain)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('logout_uri', logoutUri)
  return url.toString()
}

export const healthcheck = async (): Promise<{ status: string }> => {
  const apiBaseUrl = requireEnv(env.apiBaseUrl, 'VITE_API_BASE_URL')
  return jsonFetch<{ status: string }>(new URL('/health', apiBaseUrl).toString())
}
