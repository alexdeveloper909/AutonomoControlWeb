import { useEffect, useState } from 'react'
import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { WorkspaceSettings } from '../../domain/settings'
import { ErrorAlert } from '../components/ErrorAlert'

export function WorkspaceSummariesPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [monthSummaries, setMonthSummaries] = useState<unknown[] | null>(null)
  const [quarterSummaries, setQuarterSummaries] = useState<unknown[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setError(null)
    setMonthSummaries(null)
    setQuarterSummaries(null)
    try {
      const s = await props.api.getWorkspaceSettings(props.workspaceId)
      setSettings(s)
      const [m, q] = await Promise.all([
        props.api.monthSummaries(props.workspaceId, s),
        props.api.quarterSummaries(props.workspaceId, s),
      ])
      setMonthSummaries(m.items)
      setQuarterSummaries(q.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Stack spacing={2}>
      {error ? <ErrorAlert message={error} /> : null}
      <Button variant="outlined" onClick={refresh}>
        Refresh summaries
      </Button>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Settings</Typography>
          <TextField value={settings ? JSON.stringify(settings, null, 2) : ''} multiline minRows={5} fullWidth InputProps={{ readOnly: true }} />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Month summaries</Typography>
          <TextField
            value={monthSummaries ? JSON.stringify(monthSummaries, null, 2) : ''}
            multiline
            minRows={10}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Quarter summaries</Typography>
          <TextField
            value={quarterSummaries ? JSON.stringify(quarterSummaries, null, 2) : ''}
            multiline
            minRows={10}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Stack>
      </Paper>
    </Stack>
  )
}
