import { Button, Paper, Stack, Typography } from '@mui/material'
import { PageHeader } from '../components/PageHeader'

export function WorkspaceStatePaymentsPage(props: { workspaceId: string }) {
  return (
    <Stack spacing={2}>
      <PageHeader
        title="State payments"
        right={
          <Button variant="contained" onClick={() => undefined}>
            Add State Payment
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">No state payments yet for workspace {props.workspaceId}.</Typography>
      </Paper>
    </Stack>
  )
}

