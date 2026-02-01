import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AuthSession } from '../../domain/auth'
import { authService } from '../../application/auth/authService'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'
import { setSentryUser } from '../../infrastructure/sentry'

export function AuthProvider(props: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(() => authService.getSession())

  useEffect(() => {
    if (!session) {
      setSentryUser(null)
      return
    }
    setSentryUser({ id: session.user.sub, email: session.user.email ?? null })
  }, [session])

  const setSession = useCallback((s: AuthSession | null) => {
    setSessionState(s)
  }, [])

  const startLogin = useCallback(async () => {
    await authService.startLogin()
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setSessionState(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      startLogin,
      logout,
      setSession,
    }),
    [logout, session, setSession, startLogin],
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}
