import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { AutonomoControlApi as Api } from '../../infrastructure/api/autonomoControlApi'
import { useAuth } from '../auth/useAuth'
import type { UserMe } from '../../domain/user'
import type { AppLanguage } from '../../domain/language'
import { isAppLanguage } from '../../domain/language'
import { detectBrowserLanguage } from '../i18n/supportedLanguages'
import { setAppLanguage } from '../i18n/i18n'
import { UserSettingsContext } from './userSettingsContext'
import { UserSettingsDialog } from './UserSettingsDialog'
import { LanguageConfirmDialog } from './LanguageConfirmDialog'
import { useTranslation } from 'react-i18next'

const resolveInitialPromptLanguage = (current: AppLanguage): AppLanguage => detectBrowserLanguage() ?? current

export function UserSettingsProvider(props: PropsWithChildren) {
  const { session } = useAuth()
  const { i18n } = useTranslation()

  const api: AutonomoControlApi = useMemo(() => new Api(() => session?.tokens.idToken ?? null), [session?.tokens])

  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const promptShownRef = useRef(false)
  const [languagePromptOpen, setLanguagePromptOpen] = useState(false)
  const [promptInitialLanguage, setPromptInitialLanguage] = useState<AppLanguage>('en')

  const currentLang: AppLanguage = useMemo(() => {
    const l = i18n.language
    return isAppLanguage(l) ? l : 'en'
  }, [i18n.language])

  const refreshUser = useCallback(async () => {
    if (!session) {
      setUser(null)
      setError(null)
      setLoading(false)
      promptShownRef.current = false
      setLanguagePromptOpen(false)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const me = await api.getUserMe()
      setUser(me)

      if (me.preferredLanguage) {
        if (me.preferredLanguage !== currentLang) {
          await setAppLanguage(me.preferredLanguage)
        }
      } else if (!promptShownRef.current) {
        promptShownRef.current = true
        const initial = resolveInitialPromptLanguage(currentLang)
        setPromptInitialLanguage(initial)
        if (initial !== currentLang) await setAppLanguage(initial)
        setLanguagePromptOpen(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api, currentLang, session])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const setPreferredLanguage = useCallback(
    async (lang: AppLanguage) => {
      if (lang !== currentLang) await setAppLanguage(lang)
      if (!session) return
      const updated = await api.putUserPreferredLanguage(lang)
      setUser(updated)
    },
    [api, currentLang, session],
  )

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  return (
    <UserSettingsContext.Provider
      value={{
        user,
        loading,
        error,
        settingsOpen,
        openSettings,
        closeSettings,
        refreshUser,
        setPreferredLanguage,
      }}
    >
      {props.children}
      <UserSettingsDialog open={settingsOpen} onClose={closeSettings} />
      <LanguageConfirmDialog
        open={Boolean(session) && languagePromptOpen}
        initialLanguage={promptInitialLanguage}
        onConfirm={async (lang) => {
          await setPreferredLanguage(lang)
          setLanguagePromptOpen(false)
        }}
      />
    </UserSettingsContext.Provider>
  )
}

