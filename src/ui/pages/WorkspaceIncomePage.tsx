import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function WorkspaceIncomePage(props: { workspaceId: string }) {
  return (
    <Stack spacing={2}>
      <PageHeader
        title="Income"
        right={
          <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/income/new`}>
            Add Income
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">No income items yet for workspace {props.workspaceId}.</Typography>
      </Paper>
    </Stack>
  )
}
