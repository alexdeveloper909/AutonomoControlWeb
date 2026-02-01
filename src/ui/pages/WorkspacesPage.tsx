import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { Workspace } from '../../domain/workspace'
import { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'
import { WorkspaceCreateDialog } from './WorkspacesPage/WorkspaceCreateDialog'
import { useTranslation } from 'react-i18next'

export function WorkspacesPage() {
  const { session } = useAuth()
  const api = useMemo(() => new AutonomoControlApi(() => session?.tokens.idToken ?? null), [session?.tokens])
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [items, setItems] = useState<Workspace[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = async () => {
    setError(null)
    try {
      const ws = await api.listWorkspaces()
      setItems(ws)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (!items) return <LoadingScreen />

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

      {items.length === 0 ? (
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card
            variant="outlined"
            sx={{
              width: 'min(520px, 100%)',
              borderStyle: 'dashed',
            }}
          >
            <CardActionArea onClick={() => setCreateOpen(true)}>
              <CardContent>
                <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: 2 }}>
                  <AddCircleOutlineIcon sx={{ fontSize: 56 }} color="primary" />
                  <Box>
                    <Typography variant="h5">{t('workspaces.noWorkspacesTitle')}</Typography>
                    <Typography color="text.secondary">
                      {t('workspaces.noWorkspacesDesc')}
                    </Typography>
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
          </Card>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((w) => (
            <Grid key={w.workspaceId} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardActionArea component={RouterLink} to={`/workspaces/${w.workspaceId}`}>
                  <CardContent>
                    <Typography variant="h6">{w.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {w.workspaceId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {w.role ?? ''} {w.status ?? ''}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </AppShell>
  )
}
