import { useMemo } from 'react'
import { Link as RouterLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Box, Link, Stack, Tab, Tabs, Typography } from '@mui/material'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/AuthProvider'
import { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceRecordsPage } from './WorkspaceRecordsPage'
import { WorkspaceSummariesPage } from './WorkspaceSummariesPage'
import { WorkspaceBudgetPage } from './WorkspaceBudgetPage'

export function WorkspaceLayoutPage() {
  const params = useParams()
  const workspaceId = params.workspaceId
  const { session } = useAuth()
  const api = useMemo(() => new AutonomoControlApi(() => session?.tokens.idToken ?? null), [session?.tokens.idToken])
  const location = useLocation()

  if (!workspaceId) return <Navigate to="/workspaces" replace />
  const basePath = `/workspaces/${workspaceId}`

  const tabValue = location.pathname.includes('/summaries')
    ? 'summaries'
    : location.pathname.includes('/budget')
      ? 'budget'
      : 'records'

  return (
    <AppShell
      title="Workspace"
      right={
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {workspaceId}
          </Typography>
          <Link component={RouterLink} to="/workspaces" color="inherit" underline="hover">
            Back
          </Link>
        </Stack>
      }
    >
      <Box sx={{ mb: 2 }}>
        <Tabs value={tabValue}>
          <Tab label="Records" value="records" component={RouterLink} to={`${basePath}/records`} />
          <Tab label="Budget" value="budget" component={RouterLink} to={`${basePath}/budget`} />
          <Tab label="Summaries" value="summaries" component={RouterLink} to={`${basePath}/summaries`} />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<Navigate to={`${basePath}/records`} replace />} />
        <Route path="records" element={<WorkspaceRecordsPage workspaceId={workspaceId} api={api} />} />
        <Route path="budget" element={<WorkspaceBudgetPage workspaceId={workspaceId} api={api} />} />
        <Route path="summaries" element={<WorkspaceSummariesPage workspaceId={workspaceId} api={api} />} />
        <Route path="*" element={<Navigate to={`${basePath}/records`} replace />} />
      </Routes>
    </AppShell>
  )
}
