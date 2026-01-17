import type { AuthTokens } from '../../domain/auth'

const STORAGE_KEY = 'autonomoControl.authTokens'

export const tokenStorage = {
  read(): AuthTokens | null {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthTokens
    } catch {
      return null
    }
  },
  write(tokens: AuthTokens): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
}
