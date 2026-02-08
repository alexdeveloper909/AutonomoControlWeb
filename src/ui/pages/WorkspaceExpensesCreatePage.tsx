import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { ExpensePayload, IvaRate } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { FieldLabel } from '../components/FieldLabel'
import { parseEuroAmount } from '../lib/money'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const todayIso = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

const asExpensePayload = (payload: unknown): ExpensePayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<ExpensePayload>
  if (typeof p.documentDate !== 'string') return null
  if (typeof p.vendor !== 'string') return null
  if (typeof p.category !== 'string') return null
  if (typeof p.baseExclVat !== 'number') return null
  if (typeof p.ivaRate !== 'string') return null
  if (typeof p.vatRecoverableFlag !== 'boolean') return null
  if (typeof p.deductibleShare !== 'number') return null
  if (p.paymentDate != null && typeof p.paymentDate !== 'string') return null
  if (p.amountPaidOverride != null && typeof p.amountPaidOverride !== 'number') return null
  return p as ExpensePayload
}

export function WorkspaceExpensesCreatePage(props: {
  workspaceId: string
  api: AutonomoControlApi
  mode?: 'create' | 'edit'
  eventDate?: string
  recordId?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mode = props.mode ?? 'create'
  const editing = mode === 'edit'

  const settingsQuery = useQuery({
    queryKey: queryKeys.workspaceSettings(props.workspaceId),
    queryFn: () => props.api.getWorkspaceSettings(props.workspaceId),
  })

  const recordQuery = useQuery({
    queryKey:
      editing && props.eventDate && props.recordId
        ? queryKeys.record(props.workspaceId, 'EXPENSE', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'EXPENSE', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'EXPENSE', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [documentDate, setDocumentDate] = useState(todayIso())
  const [paymentDate, setPaymentDate] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')

  const [baseExclVat, setBaseExclVat] = useState('200')
  const [ivaRate, setIvaRate] = useState<IvaRate>('STANDARD')
  const [vatRecoverableFlag, setVatRecoverableFlag] = useState(true)
  const [deductibleShare, setDeductibleShare] = useState('1')
  const [amountPaidOverride, setAmountPaidOverride] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)

  const backToExpensesPath = `/workspaces/${props.workspaceId}/expenses`

  const categoryOptions = useMemo(() => {
    const cats = settingsQuery.data?.expenseCategories ?? []
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
    return out.sort((a, b) => a.localeCompare(b))
  }, [settingsQuery.data?.expenseCategories])

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asExpensePayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setDocumentDate(payload.documentDate)
    setPaymentDate(payload.paymentDate ?? '')
    setVendor(payload.vendor)
    setCategory(payload.category)
    setBaseExclVat(String(payload.baseExclVat))
    setIvaRate(payload.ivaRate)
    setVatRecoverableFlag(payload.vatRecoverableFlag)
    setDeductibleShare(String(payload.deductibleShare))
    setAmountPaidOverride(payload.amountPaidOverride == null ? '' : String(payload.amountPaidOverride))
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isIsoDate(documentDate)) return t('expensesCreate.validation.documentDate')
    if (paymentDate && !isIsoDate(paymentDate)) return t('expensesCreate.validation.paymentDate')
    if (!vendor.trim()) return t('expensesCreate.validation.vendorRequired')
    if (!category.trim()) return t('expensesCreate.validation.categoryRequired')
    const base = parseEuroAmount(baseExclVat)
    if (base === null) return t('expensesCreate.validation.baseNumber')
    const share = Number(deductibleShare)
    if (!Number.isFinite(share)) return t('expensesCreate.validation.deductibleShareNumber')
    if (share < 0 || share > 1) return t('expensesCreate.validation.deductibleShareRange')
    const override = amountPaidOverride.trim() ? parseEuroAmount(amountPaidOverride) : null
    if (override === null && amountPaidOverride.trim()) return t('expensesCreate.validation.amountPaidOverrideNumber')
    return null
  }, [amountPaidOverride, baseExclVat, category, deductibleShare, documentDate, editing, initializedFromRecord, paymentDate, t, vendor])

  const submit = async () => {
    setError(null)
    if (editing && !initializedFromRecord) return
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const base = parseEuroAmount(baseExclVat)
      const override = amountPaidOverride.trim() ? parseEuroAmount(amountPaidOverride) : null
      if (base === null) throw new Error(t('expensesCreate.validation.baseNumber'))
      if (override === null && amountPaidOverride.trim()) throw new Error(t('expensesCreate.validation.amountPaidOverrideNumber'))

      const payload: ExpensePayload = {
        documentDate,
        vendor: vendor.trim(),
        category: category.trim(),
        baseExclVat: base,
        ivaRate,
        vatRecoverableFlag,
        deductibleShare: Number(deductibleShare),
        paymentDate: paymentDate.trim() ? paymentDate.trim() : undefined,
        amountPaidOverride: override ?? undefined,
      }

      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'EXPENSE', props.eventDate!, props.recordId!, {
            recordType: 'EXPENSE',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'EXPENSE', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'EXPENSE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({ queryKey: queryKeys.record(props.workspaceId, 'EXPENSE', props.eventDate, props.recordId) })
        }
        navigate(backToExpensesPath, { replace: true })
      } else {
        navigate(`/workspaces/${props.workspaceId}/expenses/created`, { replace: true, state: { record: res } })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputsDisabled = submitting || (editing && !initializedFromRecord) || recordQuery.isFetching

  return (
    <Stack spacing={2}>
      <PageHeader
        title={editing ? t('expensesEdit.title') : t('expensesCreate.title')}
        description={editing ? t('expensesEdit.description') : t('expensesCreate.description')}
        right={
          <Button component={RouterLink} to={backToExpensesPath} variant="text">
            {t('common.cancel')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}
      {recordQuery.error ? (
        <ErrorAlert message={recordQuery.error instanceof Error ? recordQuery.error.message : String(recordQuery.error)} />
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          {editing && !initializedFromRecord && recordQuery.isFetching ? <LinearProgress /> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={
                <FieldLabel
                  label={t('expensesCreate.documentDate')}
                  tooltip={t('expensesCreate.tooltips.documentDate', { defaultValue: '' })}
                />
              }
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(documentDate) && !isIsoDate(documentDate)}
              helperText={t('expensesCreate.help.documentDate', { defaultValue: '' }) || undefined}
              disabled={inputsDisabled}
            />
            <TextField
              label={
                <FieldLabel
                  label={t('expensesCreate.paymentDateOptional')}
                  tooltip={t('expensesCreate.tooltips.paymentDate', { defaultValue: '' })}
                />
              }
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
              helperText={t('expensesCreate.help.paymentDate', { defaultValue: '' }) || undefined}
              disabled={inputsDisabled}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('expensesCreate.vendor')}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('expensesCreate.help.vendor', { defaultValue: '' }) || undefined}
            />
            <Autocomplete<string, false, false, true>
              freeSolo
              options={categoryOptions}
              value={category}
              inputValue={category}
              onInputChange={(_, next) => setCategory(next)}
              onChange={(_, next) => setCategory(next ?? '')}
              disabled={inputsDisabled}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    <FieldLabel
                      label={t('expensesCreate.category')}
                      tooltip={t('expensesCreate.tooltips.category', { defaultValue: '' })}
                    />
                  }
                  required
                  fullWidth
                  helperText={t('expensesCreate.help.category', { defaultValue: '' }) || undefined}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {settingsQuery.isFetching ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={
                <FieldLabel
                  label={t('expensesCreate.baseExclVat')}
                  tooltip={t('expensesCreate.tooltips.baseExclVat', { defaultValue: '' })}
                />
              }
              value={baseExclVat}
              onChange={(e) => setBaseExclVat(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('expensesCreate.help.baseExclVat', { defaultValue: '' }) || undefined}
            />
            <EuroTextField
              label={
                <FieldLabel
                  label={t('expensesCreate.amountPaidOverrideOptional')}
                  tooltip={t('expensesCreate.tooltips.amountPaidOverride', { defaultValue: '' })}
                />
              }
              value={amountPaidOverride}
              onChange={(e) => setAmountPaidOverride(e.target.value)}
              fullWidth
              helperText={t('expensesCreate.help.amountPaidOverride', { defaultValue: '' }) || undefined}
              disabled={inputsDisabled}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="iva-rate-label">
                <FieldLabel label={t('rates.iva.label')} tooltip={t('expensesCreate.tooltips.ivaRate', { defaultValue: '' })} />
              </InputLabel>
              <Select
                labelId="iva-rate-label"
                label={t('rates.iva.label')}
                value={ivaRate}
                onChange={(e) => setIvaRate(e.target.value as IvaRate)}
                disabled={inputsDisabled}
              >
                {(['ZERO', 'SUPER_REDUCED', 'REDUCED', 'STANDARD'] as const).map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(`rates.iva.${r}`)}
                  </MenuItem>
                ))}
              </Select>
              {t('expensesCreate.help.ivaRate', { defaultValue: '' }) ? (
                <FormHelperText>{t('expensesCreate.help.ivaRate', { defaultValue: '' })}</FormHelperText>
              ) : null}
            </FormControl>
            <TextField
              label={
                <FieldLabel
                  label={t('expensesCreate.deductibleShare')}
                  tooltip={t('expensesCreate.tooltips.deductibleShare', { defaultValue: '' })}
                />
              }
              value={deductibleShare}
              onChange={(e) => setDeductibleShare(e.target.value)}
              required
              fullWidth
              inputMode="decimal"
              error={Boolean(deductibleShare) && !(Number.isFinite(Number(deductibleShare)) && Number(deductibleShare) >= 0 && Number(deductibleShare) <= 1)}
              disabled={inputsDisabled}
              helperText={t('expensesCreate.help.deductibleShare', { defaultValue: '' }) || undefined}
            />
          </Stack>

          <FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={vatRecoverableFlag}
                  onChange={(e) => setVatRecoverableFlag(e.target.checked)}
                  disabled={inputsDisabled}
                />
              }
              label={
                <FieldLabel
                  label={t('expensesCreate.vatRecoverable')}
                  tooltip={t('expensesCreate.tooltips.vatRecoverable', { defaultValue: '' })}
                />
              }
            />
            {t('expensesCreate.help.vatRecoverable', { defaultValue: '' }) ? (
              <FormHelperText sx={{ mt: -0.5 }}>{t('expensesCreate.help.vatRecoverable', { defaultValue: '' })}</FormHelperText>
            ) : null}
          </FormControl>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToExpensesPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing ? (submitting ? t('common.saving') : t('common.save')) : submitting ? t('common.creating') : t('expensesCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
