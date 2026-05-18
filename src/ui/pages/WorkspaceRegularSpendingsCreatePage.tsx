import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RegularSpendingCadence, RegularSpendingPayload, RegularSpendingScheduleType } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { FieldLabel } from '../components/FieldLabel'
import { parseEuroAmount } from '../lib/money'
import { asRegularSpendingPayload } from '../lib/regularSpendingPayload'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { toLocalIsoDate } from '../lib/date'

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))

const todayIso = (): string => toLocalIsoDate(new Date())

const CADENCE_OPTIONS: RegularSpendingCadence[] = ['MONTHLY', 'QUARTERLY', 'YEARLY']
const SCHEDULE_TYPE_OPTIONS: RegularSpendingScheduleType[] = ['ONGOING', 'FIXED_TERM']

export function WorkspaceRegularSpendingsCreatePage(props: {
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
        ? queryKeys.record(props.workspaceId, 'REGULAR_SPENDING', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'REGULAR_SPENDING', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'REGULAR_SPENDING', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [scheduleType, setScheduleType] = useState<RegularSpendingScheduleType>('ONGOING')
  const [cadence, setCadence] = useState<RegularSpendingCadence>('MONTHLY')
  const [amount, setAmount] = useState('')
  const [paymentCount, setPaymentCount] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)

  const backToPath = `/workspaces/${props.workspaceId}/regular-spendings`

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asRegularSpendingPayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setName(payload.name)
    setStartDate(payload.startDate)
    setScheduleType(payload.scheduleType ?? 'ONGOING')
    if (payload.scheduleType === 'FIXED_TERM') {
      setPaymentCount(String(payload.paymentCount))
    } else {
      setCadence(payload.cadence)
      setPaymentCount('')
    }
    setAmount(String(payload.amount))
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!name.trim()) return t('regularSpendingsCreate.validation.nameRequired')
    if (name.trim().length > 80) return t('regularSpendingsCreate.validation.nameMaxLength')
    if (!isIsoDate(startDate)) return t('regularSpendingsCreate.validation.startDate')
    if (scheduleType === 'FIXED_TERM') {
      if (!paymentCount.trim()) return t('regularSpendingsCreate.validation.paymentCountRequired')
      if (!/^\d+$/.test(paymentCount.trim()) || Number(paymentCount) < 1) {
        return t('regularSpendingsCreate.validation.paymentCountPositiveInteger')
      }
    }
    const a = parseEuroAmount(amount)
    if (a === null) return t('regularSpendingsCreate.validation.amountNumber')
    if (a <= 0) return t('regularSpendingsCreate.validation.amountPositive')
    return null
  }, [editing, initializedFromRecord, name, startDate, scheduleType, paymentCount, amount, t])

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
      if (a === null || a <= 0) throw new Error(t('regularSpendingsCreate.validation.amountPositive'))

      const payload: RegularSpendingPayload =
        scheduleType === 'FIXED_TERM'
          ? {
              name: name.trim(),
              startDate,
              scheduleType: 'FIXED_TERM',
              paymentCount: Number(paymentCount),
              amount: a,
            }
          : {
              name: name.trim(),
              startDate,
              scheduleType: 'ONGOING',
              cadence,
              amount: a,
            }

      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'REGULAR_SPENDING', props.eventDate!, props.recordId!, {
            recordType: 'REGULAR_SPENDING',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'REGULAR_SPENDING', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.regularSpendings(props.workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.regularSpendingOccurrencesAll(props.workspaceId) })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({
            queryKey: queryKeys.record(props.workspaceId, 'REGULAR_SPENDING', props.eventDate, props.recordId),
          })
        }
        navigate(backToPath, { replace: true })
      } else {
        navigate(`${backToPath}/created`, { replace: true, state: { record: res } })
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
        title={editing ? t('regularSpendingsEdit.title') : t('regularSpendingsCreate.title')}
        description={editing ? t('regularSpendingsEdit.description') : t('regularSpendingsCreate.description')}
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

          <FormControl fullWidth required disabled={inputsDisabled}>
            <InputLabel shrink>{t('regularSpendingsCreate.scheduleType')}</InputLabel>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scheduleType}
              onChange={(_, value) => {
                if (value) setScheduleType(value as RegularSpendingScheduleType)
              }}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              {SCHEDULE_TYPE_OPTIONS.map((type) => (
                <ToggleButton key={type} value={type}>
                  {t(`regularSpendingsCreate.scheduleTypes.${type}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </FormControl>

          <TextField
            label={
              <FieldLabel
                label={t('regularSpendingsCreate.name')}
                tooltip={t('regularSpendingsCreate.help.name', { defaultValue: '' })}
              />
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            disabled={inputsDisabled}
            inputProps={{ maxLength: 80 }}
            helperText={t('regularSpendingsCreate.help.name', { defaultValue: '' }) || undefined}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={
                <FieldLabel
                  label={
                    scheduleType === 'FIXED_TERM'
                      ? t('regularSpendingsCreate.firstPaymentDate')
                      : t('regularSpendingsCreate.startDate')
                  }
                  tooltip={t('regularSpendingsCreate.tooltips.startDate', { defaultValue: '' })}
                />
              }
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(startDate) && !isIsoDate(startDate)}
              disabled={inputsDisabled || editing}
              helperText={t('regularSpendingsCreate.help.startDate', { defaultValue: '' }) || undefined}
            />

            {scheduleType === 'ONGOING' ? (
              <FormControl fullWidth required disabled={inputsDisabled}>
                <InputLabel id="rs-cadence-label">{t('regularSpendingsCreate.cadence')}</InputLabel>
                <Select
                  labelId="rs-cadence-label"
                  label={t('regularSpendingsCreate.cadence')}
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value as RegularSpendingCadence)}
                >
                  {CADENCE_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {t(`regularSpendings.cadence.${c}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label={t('regularSpendingsCreate.paymentCount')}
                type="number"
                value={paymentCount}
                onChange={(e) => setPaymentCount(e.target.value)}
                required
                fullWidth
                disabled={inputsDisabled}
                inputProps={{ min: 1, step: 1 }}
              />
            )}
          </Stack>

          <EuroTextField
            label={
              <FieldLabel
                label={
                  scheduleType === 'FIXED_TERM'
                    ? t('regularSpendingsCreate.monthlyAmount')
                    : t('regularSpendingsCreate.amount')
                }
                tooltip={t('regularSpendingsCreate.tooltips.amount', { defaultValue: '' })}
              />
            }
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            disabled={inputsDisabled}
            helperText={t('regularSpendingsCreate.help.amount', { defaultValue: '' }) || undefined}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing
                ? submitting
                  ? t('common.saving')
                  : t('common.save')
                : submitting
                  ? t('common.creating')
                  : t('regularSpendingsCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
