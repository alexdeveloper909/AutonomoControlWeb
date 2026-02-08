import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Button, Link as MuiLink, List, ListItemButton, ListItemText, ListSubheader, Stack, Typography, IconButton, Chip } from '@mui/material'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/useAuth'
import { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceSummariesPage } from './WorkspaceSummariesPage'
import { WorkspaceIncomeRoutes } from './WorkspaceIncomeRoutes'
import { WorkspaceExpensesRoutes } from './WorkspaceExpensesRoutes'
import { WorkspaceStatePaymentsRoutes } from './WorkspaceStatePaymentsRoutes'
import { WorkspaceTransfersRoutes } from './WorkspaceTransfersRoutes'
import { WorkspaceBudgetRoutes } from './WorkspaceBudgetRoutes'
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog'
import { useTranslation } from 'react-i18next'
import type { Workspace } from '../../domain/workspace'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'

function LegacyTransfersRedirect(props: { basePath: string }) {
  const location = useLocation()
  const legacyPrefix = `${props.basePath}/transfers`
  const suffix = location.pathname.startsWith(legacyPrefix) ? location.pathname.slice(legacyPrefix.length) : ''
  const next = `${props.basePath}/balance${suffix}${location.search}${location.hash}`
  return <Navigate to={next} replace />
}

export function WorkspaceLayoutPage() {
  const params = useParams()
  const workspaceId = params.workspaceId
  const { session } = useAuth()
  const api = useMemo(() => new AutonomoControlApi(() => session?.tokens.idToken ?? null), [session?.tokens])
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    const load = async () => {
      setError(null)
      setWorkspace(undefined)
      try {
        const all = await api.listWorkspaces()
        const found = all.find((w) => w.workspaceId === workspaceId) ?? null
        if (!cancelled) setWorkspace(found)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [api, workspaceId])

  if (!workspaceId) return <Navigate to="/workspaces" replace />
  const basePath = `/workspaces/${workspaceId}`

  if (error) {
    return (
      <AppShell title={t('workspace.title')}>
        <Stack spacing={2}>
          <ErrorAlert message={error} />
          <Button variant="contained" component={RouterLink} to="/workspaces">
            {t('common.back')}
          </Button>
        </Stack>
      </AppShell>
    )
  }

  if (workspace === undefined) return <LoadingScreen />
  if (workspace === null) {
    return (
      <AppShell title={t('workspace.title')}>
        <Stack spacing={2}>
          <ErrorAlert message={t('workspace.notFound')} />
          <Button variant="contained" component={RouterLink} to="/workspaces">
            {t('common.back')}
          </Button>
        </Stack>
      </AppShell>
    )
  }
  const readOnly = workspace.accessMode === 'READ_ONLY'

  const section = (() => {
    const rest = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : location.pathname
    const first = rest.split('/').filter(Boolean)[0]
    return first ?? 'income'
  })()

  return (
    <AppShell
      title={workspace.name || t('workspace.title')}
      right={
        <Stack direction="row" spacing={2} alignItems="center">
          {readOnly ? <Chip size="small" color="default" label={t('workspaceDetails.readOnly')} /> : null}
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {workspace.name}
          </Typography>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)} aria-label={t('common.settings')}>
            <SettingsOutlinedIcon />
          </IconButton>
          <MuiLink component={RouterLink} to="/workspaces" color="inherit" underline="hover">
            {t('workspace.back')}
          </MuiLink>
        </Stack>
      }
      nav={
        <List
          component="nav"
          subheader={
            <ListSubheader component="div" sx={{ bgcolor: 'background.paper' }}>
              {t('workspace.finance')}
            </ListSubheader>
          }
        >
          <ListItemButton component={RouterLink} to={`${basePath}/income`} selected={section === 'income'}>
            <ListItemText primary={t('workspace.income')} />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/expenses`} selected={section === 'expenses'}>
            <ListItemText primary={t('workspace.expenses')} />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/state-payments`} selected={section === 'state-payments'}>
            <ListItemText primary={t('workspace.statePayments')} />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/balance`} selected={section === 'balance'}>
            <ListItemText primary={t('workspace.transfers')} />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/budget`} selected={section === 'budget'}>
            <ListItemText primary={t('workspace.budget')} />
          </ListItemButton>
          <ListItemButton component={RouterLink} to={`${basePath}/summaries`} selected={section === 'summaries'}>
            <ListItemText primary={t('workspace.summaries')} />
          </ListItemButton>
        </List>
      }
    >
      <WorkspaceSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        workspace={workspace}
        api={api}
      />

      <Routes>
        <Route index element={<Navigate to={`${basePath}/income`} replace />} />
        <Route path="income/*" element={<WorkspaceIncomeRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="expenses/*" element={<WorkspaceExpensesRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="state-payments/*" element={<WorkspaceStatePaymentsRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="balance/*" element={<WorkspaceTransfersRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="transfers/*" element={<LegacyTransfersRedirect basePath={basePath} />} />
        <Route path="budget/*" element={<WorkspaceBudgetRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="summaries" element={<WorkspaceSummariesPage workspaceId={workspaceId} api={api} />} />
        <Route path="records" element={<Navigate to={`${basePath}/income`} replace />} />
        <Route path="*" element={<Navigate to={`${basePath}/income`} replace />} />
      </Routes>
    </AppShell>
  )
}
