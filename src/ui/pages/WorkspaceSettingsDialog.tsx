import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { WorkspaceSettings } from '../../domain/settings'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'

export function WorkspaceSettingsDialog(props: {
  open: boolean
  onClose: () => void
  workspaceId: string
  api: AutonomoControlApi
}) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const settingsText = useMemo(() => (settings ? JSON.stringify(settings, null, 2) : ''), [settings])

  const refresh = async () => {
    setError(null)
    setLoading(true)
    try {
      const s = await props.api.getWorkspaceSettings(props.workspaceId)
      setSettings(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!props.open) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.workspaceId])

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('common.settings')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <ErrorAlert message={error} /> : null}
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {t('common.loading')}
              </Typography>
            </Stack>
          ) : null}
          <TextField
            value={settingsText}
            multiline
            minRows={12}
            fullWidth
            InputProps={{ readOnly: true }}
            sx={{ '& textarea': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={refresh} disabled={loading}>
          {t('common.refresh')}
        </Button>
        <Button onClick={props.onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
