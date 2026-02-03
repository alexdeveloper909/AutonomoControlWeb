import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { Workspace } from '../../domain/workspace'
import { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'
import { WorkspaceCreateDialog } from './WorkspacesPage/WorkspaceCreateDialog'
import { WorkspaceDetailsDialog } from './WorkspacesPage/WorkspaceDetailsDialog'
import { useTranslation } from 'react-i18next'

export function WorkspacesPage() {
  const { session } = useAuth()
  const api = useMemo(() => new AutonomoControlApi(() => session?.tokens.idToken ?? null), [session?.tokens])
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [allItems, setAllItems] = useState<Workspace[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailsWorkspaceId, setDetailsWorkspaceId] = useState<string | null>(null)
  const [view, setView] = useState<'active' | 'trash'>('active')

  const refresh = async (): Promise<Workspace[] | null> => {
    setError(null)
    try {
      const ws = await api.listWorkspaces({ includeDeleted: true })
      setAllItems(ws)
      return ws
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeItems = (allItems ?? []).filter((w) => !w.deletedAt)
  const trashItems = (allItems ?? []).filter((w) => !!w.deletedAt)
  const showTabs = trashItems.length > 0
  const effectiveView = showTabs ? view : 'active'
  const items = effectiveView === 'trash' ? trashItems : activeItems

  useEffect(() => {
    if (!showTabs && view !== 'active') setView('active')
  }, [showTabs, view])

  if (error) {
    return (
      <AppShell title={t('workspaces.title')}>
        <Stack spacing={2}>
          <ErrorAlert message={error} />
          <Button variant="contained" onClick={refresh}>
            {t('common.retry')}
          </Button>
        </Stack>
      </AppShell>
    )
  }

  if (!allItems) return <LoadingScreen />

  const detailsWorkspace = detailsWorkspaceId
    ? allItems.find((w) => w.workspaceId === detailsWorkspaceId) ?? null
    : null

  return (
    <AppShell
      title={t('workspaces.title')}
      right={
        <Button color="inherit" onClick={() => setCreateOpen(true)} startIcon={<AddCircleOutlineIcon />}>
          {t('common.new')}
        </Button>
      }
    >
      <WorkspaceCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        api={api}
        onCreated={(workspace) => {
          setCreateOpen(false)
          navigate(`/workspaces/${workspace.workspaceId}`)
        }}
      />

      {detailsWorkspace ? (
        <WorkspaceDetailsDialog
          open
          workspace={detailsWorkspace}
          api={api}
          onClose={() => setDetailsWorkspaceId(null)}
          onShared={async () => {
            const next = await refresh()
            const updated = next?.find((w) => w.workspaceId === detailsWorkspace.workspaceId)
            setDetailsWorkspaceId(updated?.workspaceId ?? detailsWorkspace.workspaceId)
          }}
          onDeleted={async () => {
            setDetailsWorkspaceId(null)
            await refresh()
          }}
          onRestored={async () => {
            const next = await refresh()
            const updated = next?.find((w) => w.workspaceId === detailsWorkspace.workspaceId)
            setDetailsWorkspaceId(updated?.workspaceId ?? null)
          }}
        />
      ) : null}

      {showTabs ? (
        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 2 }}>
          <Tab value="active" label={t('workspaces.activeTab')} />
          <Tab value="trash" label={t('workspaces.trashTab')} />
        </Tabs>
      ) : null}

      {items.length === 0 ? (
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card
            variant="outlined"
            sx={{
              width: 'min(520px, 100%)',
              borderStyle: 'dashed',
            }}
          >
            {effectiveView === 'active' ? (
              <CardActionArea onClick={() => setCreateOpen(true)}>
                <CardContent>
                  <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: 2 }}>
                    <AddCircleOutlineIcon sx={{ fontSize: 56 }} color="primary" />
                    <Box>
                      <Typography variant="h5">{t('workspaces.noWorkspacesTitle')}</Typography>
                      <Typography color="text.secondary">{t('workspaces.noWorkspacesDesc')}</Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddCircleOutlineIcon />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCreateOpen(true)
                      }}
                    >
                      {t('workspaces.createWorkspace')}
                    </Button>
                  </Stack>
                </CardContent>
              </CardActionArea>
            ) : (
              <CardContent>
                <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: 2 }}>
                  <Typography variant="h5">{t('workspaces.trashEmptyTitle')}</Typography>
                  <Typography color="text.secondary">{t('workspaces.trashEmptyDesc')}</Typography>
                  <Button variant="contained" onClick={() => setView('active')}>
                    {t('workspaces.backToActive')}
                  </Button>
                </Stack>
              </CardContent>
            )}
          </Card>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((w) => (
            <Grid key={w.workspaceId} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                {effectiveView === 'active' ? (
                  <CardActionArea component={RouterLink} to={`/workspaces/${w.workspaceId}`}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                            {w.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                            {w.sharedByMe ? <Chip size="small" label={t('workspaces.shared')} /> : null}
                            {w.sharedWithMe ? <Chip size="small" label={t('workspaces.sharedReadOnly')} /> : null}
                          </Stack>
                        </Stack>
                        <IconButton
                          size="small"
                          aria-label={t('workspaces.details')}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDetailsWorkspaceId(w.workspaceId)
                          }}
                        >
                          <SettingsOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                ) : (
                  <CardActionArea onClick={() => setDetailsWorkspaceId(w.workspaceId)}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                            {w.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                            {w.sharedByMe ? <Chip size="small" label={t('workspaces.shared')} /> : null}
                            {w.sharedWithMe ? <Chip size="small" label={t('workspaces.sharedReadOnly')} /> : null}
                            {w.deletedAt ? <Chip size="small" color="warning" label={t('workspaces.trashedChip')} /> : null}
                          </Stack>
                        </Stack>
                        <IconButton
                          size="small"
                          aria-label={t('workspaces.details')}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDetailsWorkspaceId(w.workspaceId)
                          }}
                        >
                          <SettingsOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </AppShell>
  )
}
