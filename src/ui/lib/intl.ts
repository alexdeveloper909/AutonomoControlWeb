import { isAppLanguage, type AppLanguage } from '../../domain/language'

export const localeForLanguage = (lang: AppLanguage): string => {
  switch (lang) {
    case 'en':
      return 'en-US'
    case 'es':
      return 'es-ES'
    case 'uk':
      return 'uk-UA'
    case 'ar':
      return 'ar'
    case 'ro':
      return 'ro-RO'
  }
}

export const resolveLocale = (langTag: string): string => {
  const base = langTag.trim().toLowerCase().replace('_', '-').split('-')[0]
  if (isAppLanguage(base)) return localeForLanguage(base)
  return 'en-US'
}

export const decimalFormatter = (langTag: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat =>
  new Intl.NumberFormat(resolveLocale(langTag), { minimumFractionDigits: 2, maximumFractionDigits: 2, ...options })

export const euroCurrencyFormatter = (langTag: string): Intl.NumberFormat =>
  new Intl.NumberFormat(resolveLocale(langTag), { style: 'currency', currency: 'EUR' })

