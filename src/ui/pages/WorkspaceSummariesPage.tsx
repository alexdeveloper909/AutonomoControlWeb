import { useEffect, useMemo, useState } from 'react'
import { Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'

export function WorkspaceSummariesPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const [monthSummaries, setMonthSummaries] = useState<unknown[] | null>(null)
  const [quarterSummaries, setQuarterSummaries] = useState<unknown[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'month' | 'quarter'>('month')

  const activeText = useMemo(() => {
    const items = tab === 'month' ? monthSummaries : quarterSummaries
    return items ? JSON.stringify(items, null, 2) : ''
  }, [monthSummaries, quarterSummaries, tab])

  const refresh = async () => {
    setError(null)
    setMonthSummaries(null)
    setQuarterSummaries(null)
    try {
      const s = await props.api.getWorkspaceSettings(props.workspaceId)
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
      <PageHeader
        title="Summaries"
        right={
          <Button variant="outlined" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ px: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v as 'month' | 'quarter')}>
          <Tab label="Month summaries" value="month" />
          <Tab label="Quarter summaries" value="quarter" />
        </Tabs>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">{tab === 'month' ? 'Month summaries' : 'Quarter summaries'}</Typography>
          <TextField value={activeText} multiline minRows={12} fullWidth InputProps={{ readOnly: true }} />
        </Stack>
      </Paper>
    </Stack>
  )
}
