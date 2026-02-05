import { useState } from 'react'
import {
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { Workspace } from '../../../domain/workspace'
import type { WorkspaceSettings } from '../../../domain/settings'
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={onCreate}
          disabled={saving || name.trim().length === 0}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
