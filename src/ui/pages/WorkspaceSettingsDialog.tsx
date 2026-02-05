import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanWorkspaceSettings, type WorkspaceSettings } from '../../domain/settings'
import type { Workspace } from '../../domain/workspace'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'
import { ExpenseCategoriesEditor } from '../components/ExpenseCategoriesEditor'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queries/queryKeys'

export function WorkspaceSettingsDialog(props: {
  open: boolean
  onClose: () => void
  workspace: Workspace
  api: AutonomoControlApi
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [draft, setDraft] = useState<WorkspaceSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const isOwner = useMemo(() => props.workspace.role === 'OWNER' || props.workspace.status === 'OWNER', [props.workspace.role, props.workspace.status])
  const canConfirmDelete = useMemo(() => deleteConfirm.trim() === props.workspace.name.trim(), [deleteConfirm, props.workspace.name])
  const readOnly = useMemo(() => props.workspace.accessMode === 'READ_ONLY', [props.workspace.accessMode])

  const normalizeCategories = (cats: string[]): string[] => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const raw of cats) {
      const v = raw.trim()
      if (!v) continue
      const k = v.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(v)
    }
    return out
  }

  const editableSnapshot = (s: WorkspaceSettings): string =>
    JSON.stringify({
      ivaStd: s.ivaStd,
      irpfRate: s.irpfRate,
      obligacion130: s.obligacion130,
      expenseCategories: normalizeCategories(s.expenseCategories),
    })

  const dirty = useMemo(() => {
    if (!settings || !draft) return false
    return editableSnapshot(settings) !== editableSnapshot(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, draft])

  const ivaInvalid = useMemo(() => (draft ? !Number.isFinite(draft.ivaStd) || draft.ivaStd < 0 || draft.ivaStd > 1 : false), [draft])
  const irpfInvalid = useMemo(() => (draft ? !Number.isFinite(draft.irpfRate) || draft.irpfRate < 0 || draft.irpfRate > 1 : false), [draft])

  const refresh = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const s = await props.api.getWorkspaceSettings(props.workspace.workspaceId)
      const cleaned = cleanWorkspaceSettings(s)
      setSettings(cleaned)
      setDraft(cleaned)
      queryClient.setQueryData(queryKeys.workspaceSettings(props.workspace.workspaceId), cleaned)
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

  const onSave = async () => {
    if (!settings || !draft) return
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const payload = cleanWorkspaceSettings({
        year: settings.year,
        startDate: settings.startDate,
        ivaStd: draft.ivaStd,
        irpfRate: draft.irpfRate,
        obligacion130: draft.obligacion130,
        openingBalance: settings.openingBalance ?? null,
        expenseCategories: normalizeCategories(draft.expenseCategories),
      })
      const saved = await props.api.putWorkspaceSettings(props.workspace.workspaceId, payload)
      setSettings(saved)
      setDraft(saved)
      setSuccess(t('common.saved'))
      queryClient.setQueryData(queryKeys.workspaceSettings(props.workspace.workspaceId), saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

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
    <Dialog open={props.open} onClose={deleting || saving ? () => {} : props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('common.settings')}</DialogTitle>
      <DialogContent>
        {saving ? <LinearProgress /> : null}
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <ErrorAlert message={error} /> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {t('common.loading')}
              </Typography>
            </Stack>
          ) : null}

          {readOnly ? <Alert severity="info">{t('workspaceDetails.readOnlyHint')}</Alert> : null}

          {draft ? (
            <>
              <Typography variant="subtitle2">{t('workspaceCreate.settings')}</Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('workspaceCreate.year')} type="number" value={draft.year} fullWidth disabled />
                <TextField
                  label={t('workspaceCreate.startDate')}
                  type="date"
                  value={draft.startDate}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  disabled
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('workspaceCreate.ivaStandard')}
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={draft.ivaStd}
                  onChange={(e) => setDraft((s) => (s ? { ...s, ivaStd: Number(e.target.value) } : s))}
                  fullWidth
                  disabled={readOnly || saving}
                  error={ivaInvalid}
                />
                <TextField
                  label={t('workspaceCreate.irpfRate')}
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={draft.irpfRate}
                  onChange={(e) => setDraft((s) => (s ? { ...s, irpfRate: Number(e.target.value) } : s))}
                  fullWidth
                  disabled={readOnly || saving}
                  error={irpfInvalid}
                />
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={draft.obligacion130}
                    onChange={(e) => setDraft((s) => (s ? { ...s, obligacion130: e.target.checked } : s))}
                    disabled={readOnly || saving}
                  />
                }
                label={t('workspaceCreate.obligacion130')}
              />

              <TextField
                label={t('workspaceCreate.openingBalance')}
                type="text"
                value={draft.openingBalance ?? ''}
                placeholder={t('common.na')}
                fullWidth
                disabled
              />

              <Typography variant="subtitle2">{t('workspaceCreate.expenseCategories')}</Typography>
              <ExpenseCategoriesEditor
                categories={draft.expenseCategories}
                onChange={(next) => setDraft((s) => (s ? { ...s, expenseCategories: next } : s))}
                placeholder={t('workspaceCreate.categoryPlaceholder')}
                removeLabel={t('workspaceCreate.remove')}
                addLabel={t('workspaceCreate.addCategory')}
                disabled={readOnly || saving}
              />
            </>
          ) : null}

          {isOwner ? (
            <>
              <Divider />
              <Typography variant="subtitle1">{t('workspaceSettings.dangerZone')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workspaceSettings.deleteDesc')}
              </Typography>
              <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)} disabled={loading || deleting || saving}>
                {t('workspaceSettings.deleteAction')}
              </Button>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onSave}
          disabled={readOnly || loading || saving || !dirty || ivaInvalid || irpfInvalid || !draft}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {t('common.save')}
        </Button>
        <Button onClick={refresh} disabled={loading || saving}>
          {t('common.refresh')}
        </Button>
        <Button onClick={props.onClose} disabled={deleting || saving}>
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
