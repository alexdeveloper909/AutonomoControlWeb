import { CssBaseline, useMediaQuery } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { BrowserRouter } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../auth/AuthProvider'
import { SessionTimeoutProvider } from '../auth/SessionTimeoutProvider'
import { AppRouter } from './AppRouter'
import { createAppTheme } from './theme'
import { queryClient } from './queryClient'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from 'stylis-plugin-rtl'
import { prefixer } from 'stylis'
import { useTranslation } from 'react-i18next'
import { isAppLanguage } from '../../domain/language'
import { languageDirection } from '../i18n/supportedLanguages'
import { UserSettingsProvider } from '../user/UserSettingsProvider'

export function App() {
  const { i18n } = useTranslation()
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', {
    noSsr: true,
  })

  const direction = useMemo(() => {
    const lang = i18n.language
    return isAppLanguage(lang) ? languageDirection(lang) : 'ltr'
  }, [i18n.language])

  const emotionCache = useMemo(() => {
    if (direction !== 'rtl') return createCache({ key: 'mui', prepend: true })
    return createCache({
      key: 'muirtl',
      prepend: true,
      stylisPlugins: [prefixer, rtlPlugin],
    })
  }, [direction])

  const theme = useMemo(
    () => createAppTheme(prefersDarkMode ? 'dark' : 'light', direction),
    [prefersDarkMode, direction],
  )

  useEffect(() => {
    document.documentElement.dir = direction
    const lang = i18n.language
    document.documentElement.lang = isAppLanguage(lang) ? lang : 'en'
  }, [direction, i18n.language])

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
              <UserSettingsProvider>
                <SessionTimeoutProvider>
                  <AppRouter />
                </SessionTimeoutProvider>
              </UserSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  )
}
