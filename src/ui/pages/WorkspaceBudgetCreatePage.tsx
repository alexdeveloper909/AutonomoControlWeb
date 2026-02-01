import { useMemo, useState } from 'react'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
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

export function WorkspaceBudgetCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [monthKey, setMonthKey] = useState(monthKeyToday())
  const [plannedSpend, setPlannedSpend] = useState('2000')
  const [earned, setEarned] = useState('2500')
  const [description, setDescription] = useState('')
  const [budgetGoal, setBudgetGoal] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backToPath = `/workspaces/${props.workspaceId}/budget`

  const validationError = useMemo(() => {
    if (!isMonthKey(monthKey)) return t('budgetCreate.validation.month')
    const ps = parseEuroAmount(plannedSpend)
    if (ps === null) return t('budgetCreate.validation.plannedSpendNumber')
    const e = parseEuroAmount(earned)
    if (e === null) return t('budgetCreate.validation.earnedNumber')
    return null
  }, [earned, monthKey, plannedSpend, t])

  const submit = async () => {
    setError(null)
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

      const res = await props.api.createRecord(props.workspaceId, {
        recordType: 'BUDGET',
        payload: {
          monthKey,
          plannedSpend: ps,
          earned: e,
          description: description.trim() ? description.trim() : undefined,
          budgetGoal: budgetGoal.trim() ? budgetGoal.trim() : undefined,
        },
      })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'BUDGET') })

      navigate(`/workspaces/${props.workspaceId}/budget/created`, { replace: true, state: { record: res } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('budgetCreate.title')}
        description={t('budgetCreate.description')}
        right={
          <Button component={RouterLink} to={backToPath} variant="text">
            {t('common.cancel')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              {t('budgetCreate.info', {
                path: 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=BUDGET',
              })}
            </Typography>
          </Alert>

          <TextField
            label={t('budgetCreate.month')}
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            error={Boolean(monthKey) && !isMonthKey(monthKey)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={t('budgetCreate.plannedSpend')}
              value={plannedSpend}
              onChange={(e) => setPlannedSpend(e.target.value)}
              required
              fullWidth
            />
            <EuroTextField
              label={t('budgetCreate.earned')}
              value={earned}
              onChange={(e) => setEarned(e.target.value)}
              required
              fullWidth
            />
          </Stack>

          <TextField
            label={t('budgetCreate.descriptionOptional')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('budgetCreate.goalOptional')}
            value={budgetGoal}
            onChange={(e) => setBudgetGoal(e.target.value)}
            fullWidth
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? t('common.creating') : t('budgetCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
