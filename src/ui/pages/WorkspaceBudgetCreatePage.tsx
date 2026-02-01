import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { BudgetEntryPayload } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { parseEuroAmount } from '../lib/money'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const monthKeyToday = (): string => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

const isMonthKey = (s: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

const asBudgetEntryPayload = (payload: unknown): BudgetEntryPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<BudgetEntryPayload>
  if (typeof p.monthKey !== 'string') return null
  if (typeof p.plannedSpend !== 'number') return null
  if (typeof p.earned !== 'number') return null
  if (p.description != null && typeof p.description !== 'string') return null
  if (p.budgetGoal != null && typeof p.budgetGoal !== 'string') return null
  return p as BudgetEntryPayload
}

export function WorkspaceBudgetCreatePage(props: {
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
        ? queryKeys.record(props.workspaceId, 'BUDGET', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'BUDGET', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'BUDGET', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [monthKey, setMonthKey] = useState(monthKeyToday())
  const [plannedSpend, setPlannedSpend] = useState('2000')
  const [earned, setEarned] = useState('2500')
  const [description, setDescription] = useState('')
  const [budgetGoal, setBudgetGoal] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)

  const backToPath = `/workspaces/${props.workspaceId}/budget`

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asBudgetEntryPayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setMonthKey(payload.monthKey)
    setPlannedSpend(String(payload.plannedSpend))
    setEarned(String(payload.earned))
    setDescription(payload.description ?? '')
    setBudgetGoal(payload.budgetGoal ?? '')
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isMonthKey(monthKey)) return t('budgetCreate.validation.month')
    const ps = parseEuroAmount(plannedSpend)
    if (ps === null) return t('budgetCreate.validation.plannedSpendNumber')
    const e = parseEuroAmount(earned)
    if (e === null) return t('budgetCreate.validation.earnedNumber')
    return null
  }, [earned, monthKey, plannedSpend, t])

  const submit = async () => {
    setError(null)
    if (editing && !initializedFromRecord) return
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const ps = parseEuroAmount(plannedSpend)
      const e = parseEuroAmount(earned)
      if (ps === null) throw new Error(t('budgetCreate.validation.plannedSpendNumber'))
      if (e === null) throw new Error(t('budgetCreate.validation.earnedNumber'))

      const payload: BudgetEntryPayload = {
        monthKey,
        plannedSpend: ps,
        earned: e,
        description: description.trim() ? description.trim() : undefined,
        budgetGoal: budgetGoal.trim() ? budgetGoal.trim() : undefined,
      }

      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'BUDGET', props.eventDate!, props.recordId!, {
            recordType: 'BUDGET',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'BUDGET', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'BUDGET') })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({ queryKey: queryKeys.record(props.workspaceId, 'BUDGET', props.eventDate, props.recordId) })
        }
        navigate(backToPath, { replace: true })
      } else {
        navigate(`/workspaces/${props.workspaceId}/budget/created`, { replace: true, state: { record: res } })
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
        title={editing ? t('budgetEdit.title') : t('budgetCreate.title')}
        description={editing ? t('budgetEdit.description') : t('budgetCreate.description')}
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
          <Alert severity="info">
            <Typography variant="body2">
              {t('budgetCreate.info', {
                path: editing
                  ? 'PUT /workspaces/{workspaceId}/records/{recordType}/{eventDate}/{recordId}'
                  : 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=BUDGET',
              })}
            </Typography>
          </Alert>

          {editing && !initializedFromRecord && recordQuery.isFetching ? <LinearProgress /> : null}

          <TextField
            label={t('budgetCreate.month')}
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            error={Boolean(monthKey) && !isMonthKey(monthKey)}
            disabled={inputsDisabled}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={t('budgetCreate.plannedSpend')}
              value={plannedSpend}
              onChange={(e) => setPlannedSpend(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
            />
            <EuroTextField
              label={t('budgetCreate.earned')}
              value={earned}
              onChange={(e) => setEarned(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
            />
          </Stack>

          <TextField
            label={t('budgetCreate.descriptionOptional')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            disabled={inputsDisabled}
          />
          <TextField
            label={t('budgetCreate.goalOptional')}
            value={budgetGoal}
            onChange={(e) => setBudgetGoal(e.target.value)}
            fullWidth
            disabled={inputsDisabled}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing ? (submitting ? t('common.saving') : t('common.save')) : submitting ? t('common.creating') : t('budgetCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
