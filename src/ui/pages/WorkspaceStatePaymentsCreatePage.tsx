import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  FormControl,
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
import type { StatePaymentPayload, StatePaymentType } from '../../domain/records'
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

const asStatePaymentPayload = (payload: unknown): StatePaymentPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<StatePaymentPayload>
  if (typeof p.paymentDate !== 'string') return null
  if (typeof p.type !== 'string') return null
  if (typeof p.amount !== 'number') return null
  return p as StatePaymentPayload
}

export function WorkspaceStatePaymentsCreatePage(props: {
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
        ? queryKeys.record(props.workspaceId, 'STATE_PAYMENT', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'STATE_PAYMENT', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'STATE_PAYMENT', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [paymentDate, setPaymentDate] = useState(todayIso())
  const [type, setType] = useState<StatePaymentType>('Modelo303')
  const [amount, setAmount] = useState('300')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)

  const backToPath = `/workspaces/${props.workspaceId}/state-payments`

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asStatePaymentPayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setPaymentDate(payload.paymentDate)
    setType(payload.type)
    setAmount(String(payload.amount))
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isIsoDate(paymentDate)) return t('statePaymentsCreate.validation.paymentDate')
    const a = parseEuroAmount(amount)
    if (a === null) return t('statePaymentsCreate.validation.amountNumber')
    if (a < 0) return t('statePaymentsCreate.validation.amountNonNegative')
    return null
  }, [amount, editing, initializedFromRecord, paymentDate, t])

  const submit = async () => {
    setError(null)
    if (editing && !initializedFromRecord) return
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const a = parseEuroAmount(amount)
      if (a === null) throw new Error(t('statePaymentsCreate.validation.amountNumber'))

      const payload: StatePaymentPayload = { paymentDate, type, amount: a }
      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'STATE_PAYMENT', props.eventDate!, props.recordId!, {
            recordType: 'STATE_PAYMENT',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'STATE_PAYMENT', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'STATE_PAYMENT') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({
            queryKey: queryKeys.record(props.workspaceId, 'STATE_PAYMENT', props.eventDate, props.recordId),
          })
        }
        navigate(backToPath, { replace: true })
      } else {
        navigate(`/workspaces/${props.workspaceId}/state-payments/created`, { replace: true, state: { record: res } })
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
        title={editing ? t('statePaymentsEdit.title') : t('statePaymentsCreate.title')}
        description={editing ? t('statePaymentsEdit.description') : t('statePaymentsCreate.description')}
        right={
          <Button component={RouterLink} to={backToPath} variant="text">
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
                  label={t('statePaymentsCreate.paymentDate')}
                  tooltip={t('statePaymentsCreate.tooltips.paymentDate', { defaultValue: '' })}
                />
              }
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
              disabled={inputsDisabled}
              helperText={t('statePaymentsCreate.help.paymentDate', { defaultValue: '' }) || undefined}
            />
            <EuroTextField
              label={
                <FieldLabel
                  label={t('statePaymentsCreate.amount')}
                  tooltip={t('statePaymentsCreate.tooltips.amount', { defaultValue: '' })}
                />
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('statePaymentsCreate.help.amount', { defaultValue: '' }) || undefined}
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel id="state-payment-type-label">
              <FieldLabel
                label={t('statePaymentsCreate.type')}
                tooltip={t('statePaymentsCreate.tooltips.type', { defaultValue: '' })}
              />
            </InputLabel>
            <Select
              labelId="state-payment-type-label"
              label={t('statePaymentsCreate.type')}
              value={type}
              onChange={(e) => setType(e.target.value as StatePaymentType)}
              disabled={inputsDisabled}
            >
              {(['Modelo303', 'Modelo130', 'SeguridadSocial', 'RentaAnual', 'Other'] as const).map((typeOpt) => (
                <MenuItem key={typeOpt} value={typeOpt}>
                  {t(`statePaymentsCreate.types.${typeOpt}`)}
                </MenuItem>
              ))}
            </Select>
            {t('statePaymentsCreate.help.type', { defaultValue: '' }) ? (
              <FormHelperText>{t('statePaymentsCreate.help.type', { defaultValue: '' })}</FormHelperText>
            ) : null}
          </FormControl>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing ? (submitting ? t('common.saving') : t('common.save')) : submitting ? t('common.creating') : t('statePaymentsCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
