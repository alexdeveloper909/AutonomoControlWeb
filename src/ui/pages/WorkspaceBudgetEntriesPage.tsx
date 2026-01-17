import { Button, Paper, Stack, Typography } from '@mui/material'
import { PageHeader } from '../components/PageHeader'

export function WorkspaceBudgetEntriesPage(props: { workspaceId: string }) {
  return (
    <Stack spacing={2}>
      <PageHeader
        title="Budget"
        right={
          <Button variant="contained" onClick={() => undefined}>
            Add Budget Entry
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">No budget entries yet for workspace {props.workspaceId}.</Typography>
      </Paper>
    </Stack>
  )
}

