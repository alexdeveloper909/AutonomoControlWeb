import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'
import type { AppLanguage } from '../../domain/language'
import { isAppLanguage } from '../../domain/language'
import { detectBrowserLanguage } from './supportedLanguages'
import { languageStorage } from './languageStorage'

const resolveInitialLanguage = (): AppLanguage => {
  const fromStorage = languageStorage.read()
  if (fromStorage) return fromStorage
  const fromBrowser = detectBrowserLanguage()
  if (fromBrowser) return fromBrowser
  return 'en'
}

const initialLanguage = resolveInitialLanguage()

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (lng) => {
  if (!isAppLanguage(lng)) return
  languageStorage.write(lng)
})

export const setAppLanguage = async (lang: AppLanguage): Promise<void> => {
  await i18n.changeLanguage(lang)
}

export { i18n }
