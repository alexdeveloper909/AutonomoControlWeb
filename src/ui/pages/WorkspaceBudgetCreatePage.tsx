import { useEffect, useMemo, useState } from 'react'
import { Button, LinearProgress, Paper, Stack, TextField } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { BudgetEntryPayload } from '../../domain/records'
import { asBudgetEntryPayload } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { FieldLabel } from '../components/FieldLabel'
import { parseEuroAmount } from '../lib/money'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const monthKeyToday = (): string => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

const isMonthKey = (s: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

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
  const [spent, setSpent] = useState('2000')
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
    setSpent(String(payload.spent))
    setEarned(String(payload.earned))
    setDescription(payload.description ?? '')
    setBudgetGoal(payload.budgetGoal ?? '')
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isMonthKey(monthKey)) return t('budgetCreate.validation.month')
    const ps = parseEuroAmount(spent)
    if (ps === null) return t('budgetCreate.validation.spentNumber')
    const e = parseEuroAmount(earned)
    if (e === null) return t('budgetCreate.validation.earnedNumber')
    return null
  }, [earned, editing, initializedFromRecord, monthKey, spent, t])

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

      const payload: BudgetEntryPayload = {
        monthKey,
        spent: ps,
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

          <TextField
            label={t('budgetCreate.descriptionOptional')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            disabled={inputsDisabled}
            helperText={t('budgetCreate.help.description', { defaultValue: '' }) || undefined}
          />
          <TextField
            label={<FieldLabel label={t('budgetCreate.goalOptional')} tooltip={t('budgetCreate.tooltips.goal', { defaultValue: '' })} />}
            value={budgetGoal}
            onChange={(e) => setBudgetGoal(e.target.value)}
            fullWidth
            disabled={inputsDisabled}
            helperText={t('budgetCreate.help.goal', { defaultValue: '' }) || undefined}
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
