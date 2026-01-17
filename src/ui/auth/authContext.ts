import { createContext } from 'react'
import type { AuthSession } from '../../domain/auth'

export type AuthContextValue = {
  session: AuthSession | null
  startLogin: () => Promise<void>
  logout: () => void
  setSession: (session: AuthSession | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

