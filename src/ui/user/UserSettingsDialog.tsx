import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { AppLanguage } from '../../domain/language'
import { LanguageSelect } from './LanguageSelect'
import { useUserSettings } from './userSettingsContext'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'
import { isAppLanguage } from '../../domain/language'

export function UserSettingsDialog(props: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { user, loading, error, setPreferredLanguage } = useUserSettings()

  const currentLang: AppLanguage = useMemo(() => {
    const l = i18n.language
    return isAppLanguage(l) ? l : 'en'
  }, [i18n.language])

  const [draft, setDraft] = useState<AppLanguage>(currentLang)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canSave = !saving && draft !== currentLang

  useEffect(() => {
    if (!props.open) return
    setDraft(currentLang)
    setSaveError(null)
  }, [currentLang, props.open])

  const save = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      await setPreferredLanguage(draft)
      props.onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('common.userSettings')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <ErrorAlert message={error} /> : null}
          {saveError ? <ErrorAlert message={saveError} /> : null}
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {t('common.loading')}
              </Typography>
            </Stack>
          ) : null}

          {user?.email ? (
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          ) : null}

          <LanguageSelect
            value={draft}
            onChange={(lang) => setDraft(lang)}
            disabled={loading || saving}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={saving}>
          {t('common.close')}
        </Button>
        <Button variant="contained" onClick={save} disabled={!canSave}>
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
