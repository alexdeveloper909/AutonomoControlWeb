import type { AppLanguage } from '../../domain/language'
import { normalizeLanguageTag } from '../../domain/language'

export type LanguageOption = {
  code: AppLanguage
  englishName: string
  nativeName: string
}

export const languageOptions: readonly LanguageOption[] = [
  { code: 'en', englishName: 'English', nativeName: 'English' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español' },
  { code: 'uk', englishName: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية' },
  { code: 'ro', englishName: 'Romanian', nativeName: 'Română' },
] as const

export const languageDirection = (lang: AppLanguage): 'ltr' | 'rtl' => (lang === 'ar' ? 'rtl' : 'ltr')

export const detectBrowserLanguage = (): AppLanguage | null => {
  if (typeof navigator === 'undefined') return null
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0 ? navigator.languages : [navigator.language]
  for (const lang of candidates) {
    if (!lang) continue
    const normalized = normalizeLanguageTag(lang)
    if (normalized) return normalized
  }
  return null
}
