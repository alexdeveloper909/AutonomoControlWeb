export type AppLanguage = 'en' | 'es' | 'uk' | 'ar' | 'ro'

export const isAppLanguage = (value: string | null | undefined): value is AppLanguage =>
  value === 'en' || value === 'es' || value === 'uk' || value === 'ar' || value === 'ro'

export const normalizeLanguageTag = (raw: string): AppLanguage | null => {
  const base = raw.trim().toLowerCase().replace('_', '-').split('-')[0]
  return isAppLanguage(base) ? base : null
}

