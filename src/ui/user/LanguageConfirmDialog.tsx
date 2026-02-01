import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { AppLanguage } from '../../domain/language'
import { LanguageSelect } from './LanguageSelect'
import { useTranslation } from 'react-i18next'
import { isAppLanguage } from '../../domain/language'
import { ErrorAlert } from '../components/ErrorAlert'

export function LanguageConfirmDialog(props: {
  open: boolean
  initialLanguage: AppLanguage
  onConfirm: (lang: AppLanguage) => Promise<void>
}) {
  const { t, i18n } = useTranslation()

  const currentLang: AppLanguage = useMemo(() => {
    const l = i18n.language
    return isAppLanguage(l) ? l : 'en'
  }, [i18n.language])

  const [draft, setDraft] = useState<AppLanguage>(props.initialLanguage)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setDraft(props.initialLanguage)
    setSaving(false)
    setError(null)
  }, [props.initialLanguage, props.open])

  const confirm = async () => {
    setError(null)
    setSaving(true)
    try {
      await props.onConfirm(draft)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={() => {}} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>{t('languagePrompt.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('languagePrompt.body')}
          </Typography>
          {error ? <ErrorAlert message={error} /> : null}
          <LanguageSelect
            value={draft}
            onChange={(lang) => {
              setDraft(lang)
              if (lang !== currentLang) void i18n.changeLanguage(lang)
            }}
            disabled={saving}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={confirm} disabled={saving}>
          {saving ? t('common.loading') : t('common.continue')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
