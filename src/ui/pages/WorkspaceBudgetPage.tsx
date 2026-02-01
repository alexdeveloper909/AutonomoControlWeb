import { useState } from 'react'
import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'

export function WorkspaceBudgetPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t } = useTranslation()
  const [payloadJson, setPayloadJson] = useState<string>(() =>
    JSON.stringify(
      {
        monthKey: `${new Date().getFullYear()}-01`,
        plannedSpend: 2000.0,
        earned: 2500.0,
        description: 'Budget plan',
        budgetGoal: 'Save for tax',
      },
      null,
      2,
    ),
  )
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const createBudgetEntry = async () => {
    setError(null)
    setOk(false)
    try {
      const payload = JSON.parse(payloadJson) as unknown
      await props.api.createRecord(props.workspaceId, { recordType: 'BUDGET', payload: payload as never })
      setOk(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <ErrorAlert message={error} /> : null}
      {ok ? <Typography color="success.main">{t('debug.created')}</Typography> : null}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">{t('debug.createBudgetTitle')}</Typography>
          <TextField
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            minRows={10}
            multiline
            fullWidth
          />
          <Button variant="contained" onClick={createBudgetEntry}>
            {t('common.create')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
