import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function WorkspaceTransfersPage(props: { workspaceId: string }) {
  return (
    <Stack spacing={2}>
      <PageHeader
        title="Transfers"
        right={
          <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/transfers/new`}>
            Add Transfer
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">No transfers yet for workspace {props.workspaceId}.</Typography>
      </Paper>
    </Stack>
  )
}

