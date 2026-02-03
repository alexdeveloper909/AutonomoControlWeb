import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WorkspaceSettings } from '../../domain/settings'
import type { Workspace } from '../../domain/workspace'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'

export function WorkspaceSettingsDialog(props: {
  open: boolean
  onClose: () => void
  workspace: Workspace
  api: AutonomoControlApi
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const settingsText = useMemo(() => (settings ? JSON.stringify(settings, null, 2) : ''), [settings])
  const isOwner = useMemo(() => props.workspace.role === 'OWNER' || props.workspace.status === 'OWNER', [props.workspace.role, props.workspace.status])
  const canConfirmDelete = useMemo(() => deleteConfirm.trim() === props.workspace.name.trim(), [deleteConfirm, props.workspace.name])

  const refresh = async () => {
    setError(null)
    setLoading(true)
    try {
      const s = await props.api.getWorkspaceSettings(props.workspace.workspaceId)
      setSettings(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!props.open) return
    setDeleteOpen(false)
    setDeleteConfirm('')
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.workspace.workspaceId])

  const onDelete = async () => {
    setError(null)
    setDeleting(true)
    try {
      await props.api.deleteWorkspace(props.workspace.workspaceId)
      props.onClose()
      navigate('/workspaces', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setDeleteConfirm('')
    }
  }

  return (
    <Dialog open={props.open} onClose={deleting ? () => {} : props.onClose} maxWidth="md" fullWidth>
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

          {isOwner ? (
            <>
              <Divider />
              <Typography variant="subtitle1">{t('workspaceSettings.dangerZone')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workspaceSettings.deleteDesc')}
              </Typography>
              <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)} disabled={loading || deleting}>
                {t('workspaceSettings.deleteAction')}
              </Button>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={refresh} disabled={loading}>
          {t('common.refresh')}
        </Button>
        <Button onClick={props.onClose} disabled={deleting}>
          {t('common.close')}
        </Button>
      </DialogActions>

      <Dialog open={deleteOpen} onClose={deleting ? () => {} : () => setDeleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('workspaceSettings.deleteConfirmTitle', { name: props.workspace.name })}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="error">{t('workspaceSettings.deleteConfirmBody')}</Alert>
            <TextField
              label={t('workspaceSettings.deleteConfirmInputLabel')}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={props.workspace.name}
              disabled={deleting}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={onDelete}
            disabled={!canConfirmDelete || deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('workspaceSettings.deleteAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
