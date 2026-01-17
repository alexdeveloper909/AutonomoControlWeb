import { useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Link as MuiLink, List, ListItemButton, ListItemText, ListSubheader, Stack, Typography, IconButton } from '@mui/material'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/useAuth'
import { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceSummariesPage } from './WorkspaceSummariesPage'
import { WorkspaceIncomeRoutes } from './WorkspaceIncomeRoutes'
import { WorkspaceExpensesRoutes } from './WorkspaceExpensesRoutes'
import { WorkspaceStatePaymentsPage } from './WorkspaceStatePaymentsPage'
import { WorkspaceBudgetEntriesPage } from './WorkspaceBudgetEntriesPage'
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog'

export function WorkspaceLayoutPage() {
  const params = useParams()
  const workspaceId = params.workspaceId
  const { session } = useAuth()
  const api = useMemo(() => new AutonomoControlApi(() => session?.tokens.idToken ?? null), [session?.tokens])
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!workspaceId) return <Navigate to="/workspaces" replace />
  const basePath = `/workspaces/${workspaceId}`

  const section = (() => {
    const rest = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : location.pathname
    const first = rest.split('/').filter(Boolean)[0]
    return first ?? 'income'
  })()

  return (
    <AppShell
      title="Workspace"
      right={
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {workspaceId}
          </Typography>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <SettingsOutlinedIcon />
          </IconButton>
          <MuiLink component={RouterLink} to="/workspaces" color="inherit" underline="hover">
            Back
          </MuiLink>
        </Stack>
      }
      nav={
        <List
          component="nav"
          subheader={
            <ListSubheader component="div" sx={{ bgcolor: 'background.paper' }}>
              Finance
            </ListSubheader>
          }
        >
          <ListItemButton component={RouterLink} to={`${basePath}/income`} selected={section === 'income'}>
            <ListItemText primary="Income" />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/expenses`} selected={section === 'expenses'}>
            <ListItemText primary="Expenses" />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/state-payments`} selected={section === 'state-payments'}>
            <ListItemText primary="State payments" />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/budget`} selected={section === 'budget'}>
            <ListItemText primary="Budget" />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/summaries`} selected={section === 'summaries'}>
            <ListItemText primary="Summaries" />
          </ListItemButton>
        </List>
      }
    >
      <WorkspaceSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} workspaceId={workspaceId} api={api} />

      <Routes>
        <Route index element={<Navigate to={`${basePath}/income`} replace />} />
        <Route path="income/*" element={<WorkspaceIncomeRoutes workspaceId={workspaceId} api={api} />} />
        <Route path="expenses/*" element={<WorkspaceExpensesRoutes workspaceId={workspaceId} api={api} />} />
        <Route path="state-payments" element={<WorkspaceStatePaymentsPage workspaceId={workspaceId} />} />
        <Route path="budget" element={<WorkspaceBudgetEntriesPage workspaceId={workspaceId} />} />
        <Route path="summaries" element={<WorkspaceSummariesPage workspaceId={workspaceId} api={api} />} />
        <Route path="records" element={<Navigate to={`${basePath}/income`} replace />} />
        <Route path="*" element={<Navigate to={`${basePath}/income`} replace />} />
      </Routes>
    </AppShell>
  )
}
