import { useState } from 'react'
import {
  CircularProgress,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { Workspace } from '../../../domain/workspace'
import { defaultRentaPlanningSettings, type IrpfTerritory, type WorkspaceSettings } from '../../../domain/settings'
import type { AutonomoControlApi } from '../../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../../components/ErrorAlert'
import { ExpenseCategoriesEditor } from '../../components/ExpenseCategoriesEditor'
import { useTranslation } from 'react-i18next'

const defaultSettings = (): WorkspaceSettings => {
  const now = new Date()
  const year = now.getFullYear()
  return {
    year,
    startDate: `${year}-01-01`,
    ivaStd: 0.21,
    irpfRate: 0.2,
    obligacion130: true,
    openingBalance: 0,
    expenseCategories: ['Software/SaaS', 'Equipment', 'Other'],
    rentaPlanning: defaultRentaPlanningSettings(year),
  }
}

export function WorkspaceCreateDialog(props: {
  open: boolean
  onClose: () => void
  api: AutonomoControlApi
  onCreated: (workspace: Workspace) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(() => t('workspaceCreate.defaultName'))
  const [settings, setSettings] = useState<WorkspaceSettings>(() => defaultSettings())
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>('0')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isValidNumberInput = (value: string) => value === '' || /^-?\d*(\.\d*)?$/.test(value)

  const parseNumberInput = (value: string): number | null => {
    if (value.trim() === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  const territoryOptions: { value: IrpfTerritory; label: string }[] = [
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
  ]

  const onCreate = async () => {
    setError(null)
    setSaving(true)
    try {
      const openingBalance = parseNumberInput(openingBalanceInput) ?? 0
      const res = await props.api.createWorkspace({
        name: name.trim(),
        settings: {
          ...settings,
          openingBalance,
          expenseCategories: settings.expenseCategories.map((c) => c.trim()).filter(Boolean),
          rentaPlanning: settings.rentaPlanning
            ? { ...settings.rentaPlanning, taxYear: settings.year }
            : defaultRentaPlanningSettings(settings.year),
        },
      })
      props.onCreated(res.workspace)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onClose={saving ? () => {} : props.onClose}
      disableEscapeKeyDown={saving}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t('workspaceCreate.title')}</DialogTitle>
      <DialogContent>
        {saving ? <LinearProgress /> : null}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <ErrorAlert message={error} /> : null}

          <TextField label={t('workspaceCreate.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />

          <Typography variant="subtitle2">{t('workspaceCreate.settings')}</Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label={t('workspaceCreate.year')}
              type="number"
              value={settings.year}
              onChange={(e) => setSettings((s) => ({ ...s, year: Number(e.target.value) }))}
              fullWidth
            />
            <TextField
              label={t('workspaceCreate.startDate')}
              type="date"
              value={settings.startDate}
              onChange={(e) => setSettings((s) => ({ ...s, startDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label={t('workspaceCreate.ivaStandard')}
              type="number"
              inputProps={{ step: '0.01' }}
              value={settings.ivaStd}
              onChange={(e) => setSettings((s) => ({ ...s, ivaStd: Number(e.target.value) }))}
              fullWidth
            />
            <TextField
              label={t('workspaceCreate.irpfRate')}
              type="number"
              inputProps={{ step: '0.01' }}
              value={settings.irpfRate}
              onChange={(e) => setSettings((s) => ({ ...s, irpfRate: Number(e.target.value) }))}
              fullWidth
            />
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={settings.obligacion130}
                onChange={(e) => setSettings((s) => ({ ...s, obligacion130: e.target.checked }))}
              />
            }
            label={t('workspaceCreate.obligacion130')}
          />

          <TextField
            label={t('workspaceCreate.openingBalance')}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            value={openingBalanceInput}
            onChange={(e) => {
              const nextValue = e.target.value
              if (!isValidNumberInput(nextValue)) return
              setOpeningBalanceInput(nextValue)
              const parsed = parseNumberInput(nextValue)
              if (parsed === null) return
              setSettings((s) => ({ ...s, openingBalance: parsed }))
            }}
            onBlur={() => {
              const parsed = parseNumberInput(openingBalanceInput)
              if (parsed === null) {
                setOpeningBalanceInput('0')
                setSettings((s) => ({ ...s, openingBalance: 0 }))
                return
              }

              setOpeningBalanceInput(String(parsed))
              setSettings((s) => ({ ...s, openingBalance: parsed }))
            }}
            fullWidth
          />

          <Typography variant="subtitle2">{t('workspaceCreate.expenseCategories')}</Typography>
          <ExpenseCategoriesEditor
            categories={settings.expenseCategories}
            onChange={(next) => setSettings((s) => ({ ...s, expenseCategories: next }))}
            placeholder={t('workspaceCreate.categoryPlaceholder')}
            removeLabel={t('workspaceCreate.remove')}
            addLabel={t('workspaceCreate.addCategory')}
            disabled={saving}
          />

          <Divider />

          <Typography variant="subtitle2">{t('workspaceCreate.rentaPlanningTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('workspaceCreate.rentaPlanningDisclaimer')}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.rentaPlanning?.enabled ?? false}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    rentaPlanning: { ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)), enabled: e.target.checked, taxYear: s.year },
                  }))
                }
                disabled={saving}
              />
            }
            label={t('workspaceCreate.rentaPlanningEnabled')}
          />

          {settings.rentaPlanning?.enabled ? (
            <Stack spacing={2}>
              <TextField
                select
                label={t('workspaceCreate.rentaResidence')}
                value={settings.rentaPlanning.residence}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    rentaPlanning: { ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)), residence: e.target.value as IrpfTerritory },
                  }))
                }
                fullWidth
              >
                {territoryOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.rentaPlanning.minimumPersonalFamiliar == null}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        rentaPlanning: {
                          ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                          minimumPersonalFamiliar: e.target.checked ? null : 5550,
                        },
                      }))
                    }
                    disabled={saving}
                  />
                }
                label={t('workspaceCreate.rentaMinimumDefault')}
              />

              {settings.rentaPlanning.minimumPersonalFamiliar != null ? (
                <TextField
                  label={t('workspaceCreate.rentaMinimumCustom')}
                  type="number"
                  inputProps={{ step: '1' }}
                  value={settings.rentaPlanning.minimumPersonalFamiliar}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      rentaPlanning: {
                        ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                        minimumPersonalFamiliar: e.target.value === '' ? null : Number(e.target.value),
                      },
                    }))
                  }
                  fullWidth
                />
              ) : null}

              <TextField
                label={t('workspaceCreate.rentaOtherIncome')}
                type="number"
                inputProps={{ step: '0.01' }}
                value={settings.rentaPlanning.otherGeneralIncome ?? ''}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    rentaPlanning: {
                      ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                      otherGeneralIncome: e.target.value === '' ? null : Number(e.target.value),
                    },
                  }))
                }
                fullWidth
              />

              <TextField
                label={t('workspaceCreate.rentaOtherReductions')}
                type="number"
                inputProps={{ step: '0.01' }}
                value={settings.rentaPlanning.otherReductions ?? ''}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    rentaPlanning: {
                      ...(s.rentaPlanning ?? defaultRentaPlanningSettings(s.year)),
                      otherReductions: e.target.value === '' ? null : Number(e.target.value),
                    },
                  }))
                }
                fullWidth
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.rentaPlanning.inicioActividadReduction?.enabled ?? false}
                    onChange={(e) =>
                      setSettings((s) => ({
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
                      }))
                    }
                    disabled={saving}
                  />
                }
                label={t('workspaceCreate.rentaInicioEnabled')}
              />

              {settings.rentaPlanning.inicioActividadReduction?.enabled ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label={t('workspaceCreate.rentaInicioFirstPositiveYear')}
                    type="number"
                    value={settings.rentaPlanning.inicioActividadReduction.firstPositiveNetIncomeYear ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
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
                      }))
                    }
                    fullWidth
                  />
                  <TextField
                    label={t('workspaceCreate.rentaInicioCap')}
                    type="number"
                    value={settings.rentaPlanning.inicioActividadReduction.capEur ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
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
                      }))
                    }
                    fullWidth
                  />
                </Stack>
              ) : null}

              {settings.rentaPlanning.inicioActividadReduction?.enabled ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.rentaPlanning.inicioActividadReduction.incomeFromPriorEmployerShareOver50 ?? false}
                      onChange={(e) =>
                        setSettings((s) => ({
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
                        }))
                      }
                      disabled={saving}
                    />
                  }
                  label={t('workspaceCreate.rentaInicioPriorEmployerOver50')}
                />
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={onCreate}
          disabled={
            saving ||
            name.trim().length === 0 ||
            (settings.rentaPlanning?.enabled === true &&
              settings.rentaPlanning.inicioActividadReduction?.enabled === true &&
              !Number.isFinite(settings.rentaPlanning.inicioActividadReduction.firstPositiveNetIncomeYear ?? NaN))
          }
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
