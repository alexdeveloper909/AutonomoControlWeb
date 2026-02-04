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
import type { TransferOp, TransferPayload } from '../../domain/records'
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

const asTransferPayload = (payload: unknown): TransferPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<TransferPayload>
  if (typeof p.date !== 'string') return null
  if (typeof p.operation !== 'string') return null
  if (typeof p.amount !== 'number') return null
  if (p.note != null && typeof p.note !== 'string') return null
  return p as TransferPayload
}

export function WorkspaceTransfersCreatePage(props: {
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
        ? queryKeys.record(props.workspaceId, 'TRANSFER', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'TRANSFER', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'TRANSFER', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [date, setDate] = useState(todayIso())
  const [operation, setOperation] = useState<TransferOp>('Inflow')
  const [amount, setAmount] = useState('150')
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)

  const backToPath = `/workspaces/${props.workspaceId}/transfers`

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asTransferPayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setDate(payload.date)
    setOperation(payload.operation)
    setAmount(String(payload.amount))
    setNote(payload.note ?? '')
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isIsoDate(date)) return t('transfersCreate.validation.date')
    const a = parseEuroAmount(amount)
    if (a === null) return t('transfersCreate.validation.amountNumber')
    if (a < 0) return t('transfersCreate.validation.amountNonNegative')
    return null
  }, [amount, date, t])

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
      if (a === null) throw new Error(t('transfersCreate.validation.amountNumber'))

      const payload: TransferPayload = {
        date,
        operation,
        amount: a,
        note: note.trim() ? note.trim() : undefined,
      }

      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'TRANSFER', props.eventDate!, props.recordId!, {
            recordType: 'TRANSFER',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'TRANSFER', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'TRANSFER') })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({ queryKey: queryKeys.record(props.workspaceId, 'TRANSFER', props.eventDate, props.recordId) })
        }
        navigate(backToPath, { replace: true })
      } else {
        navigate(`/workspaces/${props.workspaceId}/transfers/created`, { replace: true, state: { record: res } })
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
        title={editing ? t('transfersEdit.title') : t('transfersCreate.title')}
        description={editing ? t('transfersEdit.description') : t('transfersCreate.description')}
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
                <FieldLabel label={t('transfersCreate.date')} tooltip={t('transfersCreate.tooltips.date', { defaultValue: '' })} />
              }
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(date) && !isIsoDate(date)}
              disabled={inputsDisabled}
              helperText={t('transfersCreate.help.date', { defaultValue: '' }) || undefined}
            />
            <EuroTextField
              label={
                <FieldLabel
                  label={t('transfersCreate.amount')}
                  tooltip={t('transfersCreate.tooltips.amount', { defaultValue: '' })}
                />
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('transfersCreate.help.amount', { defaultValue: '' }) || undefined}
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel id="transfer-operation-label">
              <FieldLabel
                label={t('transfersCreate.operation')}
                tooltip={t('transfersCreate.tooltips.operation', { defaultValue: '' })}
              />
            </InputLabel>
            <Select
              labelId="transfer-operation-label"
              label={t('transfersCreate.operation')}
              value={operation}
              onChange={(e) => setOperation(e.target.value as TransferOp)}
              disabled={inputsDisabled}
            >
              {(['Inflow', 'Outflow'] as const).map((op) => (
                <MenuItem key={op} value={op}>
                  {t(`transfersCreate.operations.${op}`)}
                </MenuItem>
              ))}
            </Select>
            {t('transfersCreate.help.operation', { defaultValue: '' }) ? (
              <FormHelperText>{t('transfersCreate.help.operation', { defaultValue: '' })}</FormHelperText>
            ) : null}
          </FormControl>

          <TextField
            label={t('transfersCreate.noteOptional')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={inputsDisabled}
            helperText={t('transfersCreate.help.note', { defaultValue: '' }) || undefined}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing ? (submitting ? t('common.saving') : t('common.save')) : submitting ? t('common.creating') : t('transfersCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
