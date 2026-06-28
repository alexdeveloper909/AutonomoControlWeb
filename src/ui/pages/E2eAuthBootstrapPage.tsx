import { useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import type { AuthTokens } from '../../domain/auth'
import { env } from '../../infrastructure/config/env'
import { tokenStorage } from '../../infrastructure/auth/tokenStorage'

const isLocalhost = (): boolean => {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
}

const sanitizeRedirect = (value: string | null | undefined): string => {
  if (!value) return '/workspaces'
  if (!value.startsWith('/') || value.startsWith('//')) return '/workspaces'
  return value
}

const parseTokens = (raw: string | undefined): AuthTokens => {
  if (!raw) throw new Error('Missing VITE_E2E_AUTH_TOKENS_JSON')
  const parsed = JSON.parse(raw) as Partial<AuthTokens>
  if (!parsed.idToken || !parsed.accessToken || !parsed.expiresAtEpochSeconds) {
    throw new Error('VITE_E2E_AUTH_TOKENS_JSON is missing required token fields')
  }
  return {
    idToken: parsed.idToken,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    expiresAtEpochSeconds: parsed.expiresAtEpochSeconds,
  }
}

export function E2eAuthBootstrapPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const redirectTo = useMemo(
    () => sanitizeRedirect(searchParams.get('redirect') ?? env.e2eAuthRedirect),
    [searchParams],
  )

  useEffect(() => {
    try {
      if (!env.e2eAuthEnabled) throw new Error('E2E auth bootstrap is not enabled')
      if (env.appStage === 'prod') throw new Error('E2E auth bootstrap is disabled for prod stage')
      if (!isLocalhost()) throw new Error('E2E auth bootstrap only runs on localhost')

      const tokens = parseTokens(env.e2eAuthTokensJson)
      const now = Math.floor(Date.now() / 1000)
      if (tokens.expiresAtEpochSeconds <= now + 30) {
        throw new Error('E2E auth token is expired or about to expire')
      }

      tokenStorage.write(tokens)
      window.location.replace(redirectTo)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [redirectTo])

  return (
    <Box sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center', p: 3 }}>
      <Box sx={{ maxWidth: 560, textAlign: 'center' }}>
        {error ? (
          <>
            <Typography component="h1" gutterBottom variant="h5">
              E2E auth bootstrap failed
            </Typography>
            <Typography color="error">{error}</Typography>
          </>
        ) : (
          <>
            <CircularProgress aria-label="Signing in for e2e browser testing" />
            <Typography sx={{ mt: 2 }}>Signing in for e2e browser testing...</Typography>
          </>
        )}
      </Box>
    </Box>
  )
}
