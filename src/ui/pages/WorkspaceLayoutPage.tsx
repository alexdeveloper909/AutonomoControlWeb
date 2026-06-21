import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Chip, Divider, FormControl, IconButton, InputLabel, Link as MuiLink, List, ListItemButton, ListItemText, ListSubheader, MenuItem, Select, Stack, Typography } from '@mui/material'
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
import { WorkspaceRegularSpendingsRoutes } from './WorkspaceRegularSpendingsRoutes'
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog'
import { useTranslation } from 'react-i18next'
import type { Workspace } from '../../domain/workspace'
import type { BusinessEntity } from '../../domain/settings'
import { isUkrainianFopEntity } from '../../domain/settings'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'
import { WorkspaceBusinessEntityRoutes } from './WorkspaceBusinessEntityRoutes'

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
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined)
  const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([])
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

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    const load = async () => {
      try {
        const entities = await api.listBusinessEntities(workspaceId, false)
        if (!cancelled) setBusinessEntities(entities)
      } catch {
        if (!cancelled) setBusinessEntities([])
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

  const pathParts = (() => {
    const rest = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : location.pathname
    return rest.split('/').filter(Boolean)
  })()
  const selectedEntityId = pathParts[0] === 'business-entities' && pathParts[1] ? pathParts[1] : 'autonomo'
  const selectedEntity = businessEntities.find((entity) => entity.entityId === selectedEntityId) ?? null
  const section = selectedEntityId === 'autonomo' ? pathParts[0] ?? 'income' : pathParts[2] ?? 'invoices'
  const activeBusinessEntities = businessEntities.filter((entity) => entity.entityId === 'autonomo' || !entity.archivedAt)
  const entitySelectorOptions = activeBusinessEntities.length
    ? activeBusinessEntities
    : [{ entityId: 'autonomo', type: 'AUTONOMO', name: 'Autonomo', builtIn: true } as BusinessEntity]
  const entityMode = selectedEntityId !== 'autonomo'
  const entityBasePath = `${basePath}/business-entities/${selectedEntityId}`

  return (
    <AppShell
      title={workspace.name || t('workspace.title')}
      right={
        <Stack direction="row" spacing={2} alignItems="center">
          {readOnly ? <Chip size="small" color="default" label={t('workspaceDetails.readOnly')} /> : null}
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel id="workspace-entity-selector-label">{t('businessEntities.selector')}</InputLabel>
            <Select
              labelId="workspace-entity-selector-label"
              label={t('businessEntities.selector')}
              value={selectedEntityId}
              onChange={(e) => {
                const next = e.target.value
                if (next === 'autonomo') navigate(`${basePath}/income`)
                else navigate(`${basePath}/business-entities/${next}/invoices`)
              }}
            >
              {entitySelectorOptions.map((entity) => (
                <MenuItem key={entity.entityId} value={entity.entityId}>
                  {entity.entityId === 'autonomo' ? t('businessEntities.autonomo') : entity.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
        entityMode ? (
          <List
            component="nav"
            subheader={
              <ListSubheader component="div" sx={{ bgcolor: 'background.paper' }}>
                {selectedEntity?.name ?? t('businessEntities.title')}
              </ListSubheader>
            }
          >
            {selectedEntity && !isUkrainianFopEntity(selectedEntity) ? (
              <ListItemText primary={t('businessEntities.unsupported')} sx={{ px: 2, py: 1 }} />
            ) : (
              <>
                <ListItemButton component={RouterLink} to={`${entityBasePath}/invoices`} selected={section === 'invoices'}>
                  <ListItemText primary={t('businessEntities.invoices')} />
                </ListItemButton>
                <ListItemButton component={RouterLink} to={`${entityBasePath}/summary`} selected={section === 'summary'}>
                  <ListItemText primary={t('businessEntities.summary')} />
                </ListItemButton>
              </>
            )}
          </List>
        ) : (
          <>
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
            <ListItemButton component={RouterLink} to={`${basePath}/summaries`} selected={section === 'summaries'}>
              <ListItemText primary={t('workspace.summaries')} />
            </ListItemButton>
          </List>

          <Divider sx={{ mx: 1 }} />

          <List
            component="nav"
            subheader={
              <ListSubheader component="div" sx={{ bgcolor: 'background.paper' }}>
                {t('workspace.planning')}
              </ListSubheader>
            }
          >
            <ListItemButton component={RouterLink} to={`${basePath}/balance`} selected={section === 'balance'}>
              <ListItemText primary={t('workspace.transfers')} />
            </ListItemButton>
            <ListItemButton component={RouterLink} to={`${basePath}/budget`} selected={section === 'budget'}>
              <ListItemText primary={t('workspace.budget')} />
            </ListItemButton>
            <ListItemButton component={RouterLink} to={`${basePath}/regular-spendings`} selected={section === 'regular-spendings'}>
              <ListItemText primary={t('workspace.regularSpendings')} />
            </ListItemButton>
          </List>
          </>
        )
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
        <Route path="regular-spendings/*" element={<WorkspaceRegularSpendingsRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="summaries" element={<WorkspaceSummariesPage workspaceId={workspaceId} api={api} />} />
        <Route path="business-entities/:entityId/*" element={<WorkspaceBusinessEntityRoutes workspaceId={workspaceId} api={api} readOnly={readOnly} />} />
        <Route path="records" element={<Navigate to={`${basePath}/income`} replace />} />
        <Route path="*" element={<Navigate to={`${basePath}/income`} replace />} />
      </Routes>
    </AppShell>
  )
}
