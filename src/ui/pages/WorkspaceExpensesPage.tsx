import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function WorkspaceExpensesPage(props: { workspaceId: string }) {
  return (
    <Stack spacing={2}>
      <PageHeader
        title="Expenses"
        right={
          <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/expenses/new`}>
            Add Expense
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">No expense items yet for workspace {props.workspaceId}.</Typography>
      </Paper>
    </Stack>
  )
}
