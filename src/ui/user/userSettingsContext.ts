import { createContext, useContext } from 'react'
import type { UserMe } from '../../domain/user'
import type { AppLanguage } from '../../domain/language'

export type UserSettingsContextValue = {
  user: UserMe | null
  loading: boolean
  error: string | null
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  refreshUser: () => Promise<void>
  setPreferredLanguage: (lang: AppLanguage) => Promise<void>
}

export const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

export function useUserSettings(): UserSettingsContextValue {
  const v = useContext(UserSettingsContext)
  if (!v) throw new Error('useUserSettings must be used within UserSettingsProvider')
  return v
}

