import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import type { RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'

type LocationState = { record?: RecordResponse }

export function WorkspaceBudgetCreatedPage(props: { workspaceId: string }) {
  const location = useLocation()
  const record = (location.state as LocationState | null)?.record

  return (
    <Stack spacing={2}>
      <PageHeader title="Budget entry created" />

      <Alert severity="success">Budget entry created successfully.</Alert>

      {record ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Record</Typography>
            <Typography variant="body2" color="text.secondary">
              Type: {record.recordType}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Event date: {record.eventDate}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Record id: {record.recordId}
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      <Stack direction="row" spacing={2}>
        <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/budget`}>
          Back to Budget
        </Button>
        <Button variant="text" component={RouterLink} to={`/workspaces/${props.workspaceId}/budget/new`}>
          Add another
        </Button>
      </Stack>
    </Stack>
  )
}

