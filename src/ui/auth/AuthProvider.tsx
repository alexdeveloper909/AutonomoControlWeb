import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AuthSession } from '../../domain/auth'
import { authService } from '../../application/auth/authService'

type AuthContextValue = {
  session: AuthSession | null
  startLogin: () => Promise<void>
  logout: () => void
  setSession: (session: AuthSession | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider(props: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(() => authService.getSession())

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

export const useAuth = (): AuthContextValue => {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
