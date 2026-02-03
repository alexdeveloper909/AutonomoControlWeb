import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { Workspace } from '../../../domain/workspace'
import type { AutonomoControlApi } from '../../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../../components/ErrorAlert'
import { useTranslation } from 'react-i18next'

export function WorkspaceDetailsDialog(props: {
  open: boolean
  workspace: Workspace
  api: AutonomoControlApi
  onClose: () => void
  onShared: () => void | Promise<void>
  onDeleted: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isOwner = useMemo(
    () => props.workspace.role === 'OWNER' || props.workspace.status === 'OWNER',
    [props.workspace.role, props.workspace.status],
  )
  const isReadOnly = useMemo(() => props.workspace.accessMode === 'READ_ONLY', [props.workspace.accessMode])
  const canConfirmDelete = useMemo(
    () => deleteConfirm.trim() === props.workspace.name.trim(),
    [deleteConfirm, props.workspace.name],
  )

  const onShare = async () => {
    setError(null)
    setSuccess(null)
    setSharing(true)
    try {
      const res = await props.api.shareWorkspaceReadOnly(props.workspace.workspaceId, { email: email.trim() })
      setSuccess(t('workspaceDetails.sharedSuccess', { email: res.emailLower }))
      setEmail('')
      await props.onShared()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSharing(false)
    }
  }

  const onDelete = async () => {
    setError(null)
    setSuccess(null)
    setDeleting(true)
    try {
      await props.api.deleteWorkspace(props.workspace.workspaceId)
      await props.onDeleted()
      props.onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setDeleteConfirm('')
    }
  }

  return (
    <Dialog open={props.open} onClose={sharing || deleting ? () => {} : props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('workspaces.details')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? <ErrorAlert message={error} /> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('workspaceDetails.name')}</Typography>
            <Typography>{props.workspace.name}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('workspaceDetails.id')}</Typography>
            <Typography sx={{ wordBreak: 'break-all' }}>{props.workspace.workspaceId}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="subtitle2">{t('workspaceDetails.access')}</Typography>
            <Typography>{isReadOnly ? t('workspaceDetails.readOnly') : t('workspaceDetails.readWrite')}</Typography>
          </Stack>

          {isReadOnly ? <Alert severity="info">{t('workspaceDetails.readOnlyHint')}</Alert> : null}

          {isOwner ? (
            <>
              <Divider />
              <Typography variant="subtitle1">{t('workspaceDetails.shareTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workspaceDetails.shareDesc')}
              </Typography>
              <TextField
                label={t('workspaceDetails.shareEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                fullWidth
                disabled={sharing || deleting}
              />
              <Button
                variant="contained"
                onClick={onShare}
                disabled={sharing || deleting || email.trim().length === 0}
                startIcon={sharing ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {t('workspaceDetails.shareAction')}
              </Button>

              <Divider />
              <Typography variant="subtitle1">{t('workspaceSettings.dangerZone')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workspaceSettings.deleteDesc')}
              </Typography>
              <Button
                color="error"
                variant="outlined"
                onClick={() => setDeleteOpen(true)}
                disabled={sharing || deleting}
              >
                {t('workspaceSettings.deleteAction')}
              </Button>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={sharing || deleting}>
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
