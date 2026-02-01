import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { IvaRate, InvoicePayload, RetencionRate } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
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

const asInvoicePayload = (payload: unknown): InvoicePayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<InvoicePayload>
  if (typeof p.invoiceDate !== 'string') return null
  if (typeof p.number !== 'string') return null
  if (typeof p.client !== 'string') return null
  if (typeof p.baseExclVat !== 'number') return null
  if (typeof p.ivaRate !== 'string') return null
  if (typeof p.retencion !== 'string') return null
  if (p.paymentDate != null && typeof p.paymentDate !== 'string') return null
  if (p.amountReceivedOverride != null && typeof p.amountReceivedOverride !== 'number') return null
  return p as InvoicePayload
}

export function WorkspaceIncomeCreatePage(props: {
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

  const recordQuery = useQuery({
    queryKey:
      editing && props.eventDate && props.recordId
        ? queryKeys.record(props.workspaceId, 'INVOICE', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'INVOICE', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'INVOICE', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [number, setNumber] = useState('')
  const [client, setClient] = useState('')
  const [baseExclVat, setBaseExclVat] = useState('1000')
  const [ivaRate, setIvaRate] = useState<IvaRate>('STANDARD')
  const [retencion, setRetencion] = useState<RetencionRate>('STANDARD')
  const [paymentDate, setPaymentDate] = useState('')
  const [amountReceivedOverride, setAmountReceivedOverride] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)

  const backToIncomePath = `/workspaces/${props.workspaceId}/income`

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asInvoicePayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setInvoiceDate(payload.invoiceDate)
    setNumber(payload.number)
    setClient(payload.client)
    setBaseExclVat(String(payload.baseExclVat))
    setIvaRate(payload.ivaRate)
    setRetencion(payload.retencion)
    setPaymentDate(payload.paymentDate ?? '')
    setAmountReceivedOverride(payload.amountReceivedOverride == null ? '' : String(payload.amountReceivedOverride))
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isIsoDate(invoiceDate)) return t('incomeCreate.validation.invoiceDate')
    if (paymentDate && !isIsoDate(paymentDate)) return t('incomeCreate.validation.paymentDate')
    if (!number.trim()) return t('incomeCreate.validation.invoiceNumberRequired')
    if (!client.trim()) return t('incomeCreate.validation.clientRequired')
    const base = parseEuroAmount(baseExclVat)
    if (base === null) return t('incomeCreate.validation.baseNumber')
    const override = amountReceivedOverride.trim() ? parseEuroAmount(amountReceivedOverride) : null
    if (override === null && amountReceivedOverride.trim()) return t('incomeCreate.validation.amountReceivedOverrideNumber')
    return null
  }, [amountReceivedOverride, baseExclVat, client, invoiceDate, number, paymentDate, t])

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
      const override = amountReceivedOverride.trim() ? parseEuroAmount(amountReceivedOverride) : null
      if (base === null) throw new Error(t('incomeCreate.validation.baseNumber'))
      if (override === null && amountReceivedOverride.trim()) throw new Error(t('incomeCreate.validation.amountReceivedOverrideNumber'))

      const payload: InvoicePayload = {
        invoiceDate,
        number: number.trim(),
        client: client.trim(),
        baseExclVat: base,
        ivaRate,
        retencion,
        paymentDate: paymentDate.trim() ? paymentDate.trim() : undefined,
        amountReceivedOverride: override ?? undefined,
      }

      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'INVOICE', props.eventDate!, props.recordId!, {
            recordType: 'INVOICE',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'INVOICE', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'INVOICE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({ queryKey: queryKeys.record(props.workspaceId, 'INVOICE', props.eventDate, props.recordId) })
        }
        navigate(backToIncomePath, { replace: true })
      } else {
        navigate(`/workspaces/${props.workspaceId}/income/created`, { replace: true, state: { record: res } })
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
        title={editing ? t('incomeEdit.title') : t('incomeCreate.title')}
        description={editing ? t('incomeEdit.description') : t('incomeCreate.description')}
        right={
          <Button component={RouterLink} to={backToIncomePath} variant="text">
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
          <Alert severity="info">
            <Typography variant="body2">
              {t('incomeCreate.info', {
                path: editing
                  ? 'PUT /workspaces/{workspaceId}/records/{recordType}/{eventDate}/{recordId}'
                  : 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=INVOICE',
              })}
            </Typography>
          </Alert>

          {editing && !initializedFromRecord && recordQuery.isFetching ? <LinearProgress /> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('incomeCreate.invoiceDate')}
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(invoiceDate) && !isIsoDate(invoiceDate)}
              disabled={inputsDisabled}
            />
            <TextField
              label={t('incomeCreate.paymentDateOptional')}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
              helperText={t('incomeCreate.eventDateHint')}
              disabled={inputsDisabled}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('incomeCreate.invoiceNumber')}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
            />
            <TextField
              label={t('incomeCreate.client')}
              value={client}
              onChange={(e) => setClient(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={t('incomeCreate.baseExclVat')}
              value={baseExclVat}
              onChange={(e) => setBaseExclVat(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
            />
            <EuroTextField
              label={t('incomeCreate.amountReceivedOverrideOptional')}
              value={amountReceivedOverride}
              onChange={(e) => setAmountReceivedOverride(e.target.value)}
              fullWidth
              helperText={t('incomeCreate.amountReceivedOverrideHint')}
              disabled={inputsDisabled}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="iva-rate-label">{t('rates.iva.label')}</InputLabel>
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
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="retencion-label">{t('rates.retencion.label')}</InputLabel>
              <Select
                labelId="retencion-label"
                label={t('rates.retencion.label')}
                value={retencion}
                onChange={(e) => setRetencion(e.target.value as RetencionRate)}
                disabled={inputsDisabled}
              >
                {(['ZERO', 'NEW_PROFESSIONAL', 'STANDARD'] as const).map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(`rates.retencion.${r}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToIncomePath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing
                ? submitting
                  ? t('common.saving')
                  : t('common.save')
                : submitting
                  ? t('common.creating')
                  : t('incomeCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
