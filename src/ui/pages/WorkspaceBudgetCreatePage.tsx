import { useEffect, useMemo, useState } from 'react'
import { Button, LinearProgress, Paper, Stack, TextField } from '@mui/material'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { BudgetEntryPayload, RecordResponse } from '../../domain/records'
import { asBudgetEntryPayload } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { FieldLabel } from '../components/FieldLabel'
import { parseEuroAmount } from '../lib/money'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { HttpError } from '../../infrastructure/http/httpError'

const defaultMonthKey = (): string => {
  const d = new Date()
  if (d.getDate() <= 10) d.setMonth(d.getMonth() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

const isMonthKey = (s: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

const parseOptionalEuroAmount = (raw: string): number | null | undefined => {
  if (!raw.trim()) return undefined
  return parseEuroAmount(raw)
}

const parseLegacyTarget = (raw?: string): string => {
  if (!raw) return ''
  const normalized = raw.trim().replace(/€|\s/g, '').replace(',', '.')
  if (!normalized) return ''
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? String(value) : ''
}

const isDuplicateError = (e: unknown): boolean =>
  e instanceof HttpError && e.status === 409

export function WorkspaceBudgetCreatePage(props: {
  workspaceId: string
  api: AutonomoControlApi
  mode?: 'create' | 'edit'
  eventDate?: string
  recordId?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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

  const requestedMonthKey = searchParams.get('monthKey') ?? ''
  const [monthKey, setMonthKey] = useState(isMonthKey(requestedMonthKey) ? requestedMonthKey : defaultMonthKey())
  const [spent, setSpent] = useState('2000')
  const [earned, setEarned] = useState('2500')
  const [targetSpend, setTargetSpend] = useState('')
  const [exceptionalSpend, setExceptionalSpend] = useState('')
  const [notes, setNotes] = useState('')
  const [exceptionalNotes, setExceptionalNotes] = useState('')

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
    setSpent(String(payload.spent))
    setEarned(String(payload.earned))
    setTargetSpend(payload.targetSpend != null ? String(payload.targetSpend) : parseLegacyTarget(payload.budgetGoal))
    setExceptionalSpend(payload.exceptionalSpend != null ? String(payload.exceptionalSpend) : '')
    setNotes(payload.notes ?? payload.description ?? '')
    setExceptionalNotes(payload.exceptionalNotes ?? '')
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isMonthKey(monthKey)) return t('budgetCreate.validation.month')
    const ps = parseEuroAmount(spent)
    if (ps === null) return t('budgetCreate.validation.spentNumber')
    if (ps < 0) return t('budgetCreate.validation.spentNonNegative')
    const e = parseEuroAmount(earned)
    if (e === null) return t('budgetCreate.validation.earnedNumber')
    if (e < 0) return t('budgetCreate.validation.earnedNonNegative')
    const target = parseOptionalEuroAmount(targetSpend)
    if (target === null) return t('budgetCreate.validation.targetNumber')
    if (target != null && target < 0) return t('budgetCreate.validation.targetNonNegative')
    const exceptional = parseOptionalEuroAmount(exceptionalSpend)
    if (exceptional === null) return t('budgetCreate.validation.exceptionalNumber')
    if (exceptional != null && exceptional < 0) return t('budgetCreate.validation.exceptionalNonNegative')
    if (exceptional != null && exceptional > ps) return t('budgetCreate.validation.exceptionalTooHigh')
    return null
  }, [earned, editing, exceptionalSpend, initializedFromRecord, monthKey, spent, targetSpend, t])

  const duplicateInLoadedYear = (): boolean => {
    const cached = queryClient.getQueryData<RecordResponse[]>(queryKeys.recordsByYear(props.workspaceId, 'BUDGET', monthKey.slice(0, 4)))
    if (!cached) return false
    return cached.some((record) => {
      const payload = asBudgetEntryPayload(record.payload)
      return payload?.monthKey === monthKey
    })
  }

  const submit = async () => {
    setError(null)
    if (editing && !initializedFromRecord) return
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const ps = parseEuroAmount(spent)
      const e = parseEuroAmount(earned)
      if (ps === null) throw new Error(t('budgetCreate.validation.spentNumber'))
      if (e === null) throw new Error(t('budgetCreate.validation.earnedNumber'))
      const target = parseOptionalEuroAmount(targetSpend)
      const exceptional = parseOptionalEuroAmount(exceptionalSpend)
      if (target === null) throw new Error(t('budgetCreate.validation.targetNumber'))
      if (exceptional === null) throw new Error(t('budgetCreate.validation.exceptionalNumber'))

      if (!editing) {
        if (duplicateInLoadedYear()) {
          setError(t('budgetCreate.validation.duplicateMonth', { month: monthKey }))
          return
        }
        const existing = await props.api.listRecordsByMonth(props.workspaceId, monthKey, 'BUDGET')
        if (existing.some((record) => asBudgetEntryPayload(record.payload)?.monthKey === monthKey)) {
          setError(t('budgetCreate.validation.duplicateMonth', { month: monthKey }))
          return
        }
      }

      const payload: BudgetEntryPayload = {
        monthKey,
        spent: ps,
        earned: e,
        targetSpend: target,
        exceptionalSpend: exceptional,
        notes: notes.trim() ? notes.trim() : undefined,
        exceptionalNotes: exceptionalNotes.trim() ? exceptionalNotes.trim() : undefined,
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
      setError(isDuplicateError(e) ? t('budgetCreate.validation.duplicateMonth', { month: monthKey }) : e instanceof Error ? e.message : String(e))
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
          {editing && !initializedFromRecord && recordQuery.isFetching ? <LinearProgress /> : null}

          <TextField
            label={
              <FieldLabel label={t('budgetCreate.month')} tooltip={t('budgetCreate.tooltips.month', { defaultValue: '' })} />
            }
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            error={Boolean(monthKey) && !isMonthKey(monthKey)}
            disabled={inputsDisabled || editing}
            helperText={t('budgetCreate.help.month', { defaultValue: '' }) || undefined}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={
                <FieldLabel
                  label={t('budgetCreate.spent')}
                  tooltip={t('budgetCreate.tooltips.spent', { defaultValue: '' })}
                />
              }
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('budgetCreate.help.spent', { defaultValue: '' }) || undefined}
            />
            <EuroTextField
              label={<FieldLabel label={t('budgetCreate.earned')} tooltip={t('budgetCreate.tooltips.earned', { defaultValue: '' })} />}
              value={earned}
              onChange={(e) => setEarned(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('budgetCreate.help.earned', { defaultValue: '' }) || undefined}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={
                <FieldLabel
                  label={t('budgetCreate.targetSpendOptional')}
                  tooltip={t('budgetCreate.tooltips.targetSpend', { defaultValue: '' })}
                />
              }
              value={targetSpend}
              onChange={(e) => setTargetSpend(e.target.value)}
              fullWidth
              disabled={inputsDisabled}
              helperText={t('budgetCreate.help.targetSpend', { defaultValue: '' }) || undefined}
            />
            <EuroTextField
              label={
                <FieldLabel
                  label={t('budgetCreate.exceptionalSpendOptional')}
                  tooltip={t('budgetCreate.tooltips.exceptionalSpend', { defaultValue: '' })}
                />
              }
              value={exceptionalSpend}
              onChange={(e) => setExceptionalSpend(e.target.value)}
              fullWidth
              disabled={inputsDisabled}
              helperText={t('budgetCreate.help.exceptionalSpend', { defaultValue: '' }) || undefined}
            />
          </Stack>

          <TextField
            label={t('budgetCreate.notesOptional')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            disabled={inputsDisabled}
            helperText={t('budgetCreate.help.notes', { defaultValue: '' }) || undefined}
          />
          <TextField
            label={
              <FieldLabel
                label={t('budgetCreate.exceptionalNotesOptional')}
                tooltip={t('budgetCreate.tooltips.exceptionalNotes', { defaultValue: '' })}
              />
            }
            value={exceptionalNotes}
            onChange={(e) => setExceptionalNotes(e.target.value)}
            fullWidth
            disabled={inputsDisabled}
            helperText={t('budgetCreate.help.exceptionalNotes', { defaultValue: '' }) || undefined}
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
