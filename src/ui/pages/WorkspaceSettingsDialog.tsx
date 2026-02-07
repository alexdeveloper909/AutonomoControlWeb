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
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanWorkspaceSettings, defaultRentaPlanningSettings, type IrpfTerritory, type WorkspaceSettings } from '../../domain/settings'
import type { Workspace } from '../../domain/workspace'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'
import { ExpenseCategoriesEditor } from '../components/ExpenseCategoriesEditor'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queries/queryKeys'
import { FieldLabel } from '../components/FieldLabel'

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
      rentaPlanning: s.rentaPlanning,
    })

  const dirty = useMemo(() => {
    if (!settings || !draft) return false
    return editableSnapshot(settings) !== editableSnapshot(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, draft])

  const ivaInvalid = useMemo(() => (draft ? !Number.isFinite(draft.ivaStd) || draft.ivaStd < 0 || draft.ivaStd > 1 : false), [draft])
  const irpfInvalid = useMemo(() => (draft ? !Number.isFinite(draft.irpfRate) || draft.irpfRate < 0 || draft.irpfRate > 1 : false), [draft])
  const rentaForalUnsupported = useMemo(
    () =>
      draft?.rentaPlanning?.enabled === true && (draft.rentaPlanning.residence === 'NAVARRA' || draft.rentaPlanning.residence === 'PAIS_VASCO'),
    [draft],
  )
  const rentaInicioMissingYear = useMemo(
    () => draft?.rentaPlanning?.enabled === true && draft.rentaPlanning.inicioActividadReduction?.enabled === true && !Number.isFinite(draft.rentaPlanning.inicioActividadReduction.firstPositiveNetIncomeYear ?? NaN),
    [draft],
  )

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
        rentaPlanning: draft.rentaPlanning,
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

              <Divider />
              <Typography variant="subtitle2">{t('workspaceCreate.rentaPlanningTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workspaceCreate.rentaPlanningDisclaimer')}
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={draft.rentaPlanning?.enabled ?? false}
                    onChange={(e) =>
                      setDraft((s) =>
                        s
                          ? {
                              ...s,
                              rentaPlanning: { ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)), enabled: e.target.checked, taxYear: s.year },
                            }
                          : s,
                      )
                    }
                    disabled={readOnly || saving}
                  />
                }
                label={
                  <FieldLabel
                    label={t('workspaceCreate.rentaPlanningEnabled')}
                    tooltip={t('workspaceCreate.rentaTooltips.enabled', { defaultValue: '' })}
                  />
                }
              />
              <Typography variant="caption" color="text.secondary">
                {t('workspaceCreate.rentaHelp.enabled')}
              </Typography>

              {draft.rentaPlanning?.enabled ? (
                <Stack spacing={2}>
                  <TextField
                    select
                    label={
                      <FieldLabel
                        label={t('workspaceCreate.rentaResidence')}
                        tooltip={t('workspaceCreate.rentaTooltips.residence', { defaultValue: '' })}
                      />
                    }
                    value={draft.rentaPlanning.residence}
                    onChange={(e) =>
                      setDraft((s) =>
                        s
                          ? {
                              ...s,
                              rentaPlanning: { ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)), residence: e.target.value as IrpfTerritory },
                            }
                          : s,
                      )
                    }
                    fullWidth
                    disabled={readOnly || saving}
                    helperText={t('workspaceCreate.rentaHelp.residence')}
                  >
                    {[
                      { value: 'DEFAULT', label: 'Default' },
                      { value: 'ANDALUCIA', label: 'Andalucía' },
                      { value: 'ARAGON', label: 'Aragón' },
                      { value: 'ASTURIAS', label: 'Asturias' },
                      { value: 'BALEARES', label: 'Baleares' },
                      { value: 'CANARIAS', label: 'Canarias' },
                      { value: 'CANTABRIA', label: 'Cantabria' },
                      { value: 'CASTILLA_LA_MANCHA', label: 'Castilla-La Mancha' },
                      { value: 'CASTILLA_Y_LEON', label: 'Castilla y León' },
                      { value: 'CATALUNYA', label: 'Catalunya' },
                      { value: 'COMUNITAT_VALENCIANA', label: 'Comunitat Valenciana' },
                      { value: 'EXTREMADURA', label: 'Extremadura' },
                      { value: 'GALICIA', label: 'Galicia' },
                      { value: 'LA_RIOJA', label: 'La Rioja' },
                      { value: 'MADRID', label: 'Madrid' },
                      { value: 'MURCIA', label: 'Murcia' },
                      { value: 'NAVARRA', label: 'Navarra (not supported in MVP)' },
                      { value: 'PAIS_VASCO', label: 'País Vasco (not supported in MVP)' },
                      { value: 'CEUTA_MELILLA', label: 'Ceuta/Melilla' },
                    ].map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {rentaForalUnsupported ? <Alert severity="warning">{t('workspaceCreate.rentaForalUnsupported')}</Alert> : null}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={draft.rentaPlanning.minimumPersonalFamiliar == null}
                        onChange={(e) =>
                          setDraft((s) =>
                            s
                              ? {
                                  ...s,
                                  rentaPlanning: {
                                    ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                    minimumPersonalFamiliar: e.target.checked ? null : 5550,
                                  },
                                }
                              : s,
                          )
                        }
                        disabled={readOnly || saving}
                      />
                    }
                    label={
                      <FieldLabel
                        label={t('workspaceCreate.rentaMinimumDefault')}
                        tooltip={t('workspaceCreate.rentaTooltips.minimum', { defaultValue: '' })}
                      />
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t('workspaceCreate.rentaHelp.minimum')}
                  </Typography>

                  {draft.rentaPlanning.minimumPersonalFamiliar != null ? (
                    <TextField
                      label={t('workspaceCreate.rentaMinimumCustom')}
                      type="number"
                      inputProps={{ step: '1' }}
                      value={draft.rentaPlanning.minimumPersonalFamiliar}
                      onChange={(e) =>
                        setDraft((s) =>
                          s
                            ? {
                                ...s,
                                rentaPlanning: {
                                  ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                  minimumPersonalFamiliar: e.target.value === '' ? null : Number(e.target.value),
                                },
                              }
                            : s,
                        )
                      }
                      fullWidth
                      disabled={readOnly || saving}
                      helperText={t('workspaceCreate.rentaHelp.minimumCustom')}
                    />
                  ) : null}

                  <TextField
                    label={
                      <FieldLabel
                        label={t('workspaceCreate.rentaOtherIncome')}
                        tooltip={t('workspaceCreate.rentaTooltips.otherIncome', { defaultValue: '' })}
                      />
                    }
                    type="number"
                    inputProps={{ step: '0.01' }}
                    value={draft.rentaPlanning.otherGeneralIncome ?? ''}
                    onChange={(e) =>
                      setDraft((s) =>
                        s
                          ? {
                              ...s,
                              rentaPlanning: {
                                ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                otherGeneralIncome: e.target.value === '' ? null : Number(e.target.value),
                              },
                            }
                          : s,
                      )
                    }
                    fullWidth
                    disabled={readOnly || saving}
                    helperText={t('workspaceCreate.rentaHelp.otherIncome')}
                  />

                  <TextField
                    label={
                      <FieldLabel
                        label={t('workspaceCreate.rentaOtherReductions')}
                        tooltip={t('workspaceCreate.rentaTooltips.otherReductions', { defaultValue: '' })}
                      />
                    }
                    type="number"
                    inputProps={{ step: '0.01' }}
                    value={draft.rentaPlanning.otherReductions ?? ''}
                    onChange={(e) =>
                      setDraft((s) =>
                        s
                          ? {
                              ...s,
                              rentaPlanning: {
                                ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                otherReductions: e.target.value === '' ? null : Number(e.target.value),
                              },
                            }
                          : s,
                      )
                    }
                    fullWidth
                    disabled={readOnly || saving}
                    helperText={t('workspaceCreate.rentaHelp.otherReductions')}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={draft.rentaPlanning.inicioActividadReduction?.enabled ?? false}
                        onChange={(e) =>
                          setDraft((s) =>
                            s
                              ? {
                                  ...s,
                                  rentaPlanning: {
                                    ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                    inicioActividadReduction: e.target.checked
                                      ? {
                                          enabled: true,
                                          firstPositiveNetIncomeYear: s.year,
                                          incomeFromPriorEmployerShareOver50: false,
                                          capEur: null,
                                        }
                                      : null,
                                  },
                                }
                              : s,
                          )
                        }
                        disabled={readOnly || saving}
                      />
                    }
                    label={
                      <FieldLabel
                        label={t('workspaceCreate.rentaInicioEnabled')}
                        tooltip={t('workspaceCreate.rentaTooltips.inicioEnabled', { defaultValue: '' })}
                      />
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t('workspaceCreate.rentaHelp.inicioEnabled')}
                  </Typography>

                  {draft.rentaPlanning.inicioActividadReduction?.enabled ? (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label={
                            <FieldLabel
                              label={t('workspaceCreate.rentaInicioFirstPositiveYear')}
                              tooltip={t('workspaceCreate.rentaTooltips.inicioFirstPositiveYear', { defaultValue: '' })}
                            />
                          }
                          type="number"
                          value={draft.rentaPlanning.inicioActividadReduction.firstPositiveNetIncomeYear ?? ''}
                          onChange={(e) =>
                            setDraft((s) =>
                              s
                                ? {
                                    ...s,
                                    rentaPlanning: {
                                      ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                      inicioActividadReduction: s.rentaPlanning?.inicioActividadReduction
                                        ? {
                                            ...s.rentaPlanning.inicioActividadReduction,
                                            firstPositiveNetIncomeYear: e.target.value === '' ? null : Number(e.target.value),
                                          }
                                        : null,
                                    },
                                  }
                                : s,
                            )
                          }
                          fullWidth
                          disabled={readOnly || saving}
                          error={rentaInicioMissingYear}
                          helperText={t('workspaceCreate.rentaHelp.inicioFirstPositiveYear')}
                        />
                        <TextField
                          label={
                            <FieldLabel
                              label={t('workspaceCreate.rentaInicioCap')}
                              tooltip={t('workspaceCreate.rentaTooltips.inicioCap', { defaultValue: '' })}
                            />
                          }
                          type="number"
                          value={draft.rentaPlanning.inicioActividadReduction.capEur ?? ''}
                          onChange={(e) =>
                            setDraft((s) =>
                              s
                                ? {
                                    ...s,
                                    rentaPlanning: {
                                      ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                      inicioActividadReduction: s.rentaPlanning?.inicioActividadReduction
                                        ? {
                                            ...s.rentaPlanning.inicioActividadReduction,
                                            capEur: e.target.value === '' ? null : Number(e.target.value),
                                          }
                                        : null,
                                    },
                                  }
                                : s,
                            )
                          }
                          fullWidth
                          disabled={readOnly || saving}
                          helperText={t('workspaceCreate.rentaHelp.inicioCap')}
                        />
                      </Stack>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={draft.rentaPlanning.inicioActividadReduction.incomeFromPriorEmployerShareOver50 ?? false}
                            onChange={(e) =>
                              setDraft((s) =>
                                s
                                  ? {
                                      ...s,
                                      rentaPlanning: {
                                        ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                                        inicioActividadReduction: s.rentaPlanning?.inicioActividadReduction
                                          ? {
                                              ...s.rentaPlanning.inicioActividadReduction,
                                              incomeFromPriorEmployerShareOver50: e.target.checked,
                                            }
                                          : null,
                                      },
                                    }
                                  : s,
                              )
                            }
                            disabled={readOnly || saving}
                          />
                        }
                        label={
                          <FieldLabel
                            label={t('workspaceCreate.rentaInicioPriorEmployerOver50')}
                            tooltip={t('workspaceCreate.rentaTooltips.inicioPriorEmployerOver50', { defaultValue: '' })}
                          />
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('workspaceCreate.rentaHelp.inicioPriorEmployerOver50')}
                      </Typography>
                    </>
                  ) : null}
                </Stack>
              ) : null}
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
          disabled={readOnly || loading || saving || !dirty || ivaInvalid || irpfInvalid || rentaForalUnsupported || rentaInicioMissingYear || !draft}
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
