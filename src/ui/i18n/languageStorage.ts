import type { AppLanguage } from '../../domain/language'
import { isAppLanguage } from '../../domain/language'

const STORAGE_KEY = 'autonomoControl.language'

export const languageStorage = {
  read(): AppLanguage | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return isAppLanguage(raw) ? raw : null
    } catch {
      return null
    }
  },
  write(lang: AppLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  },
}
