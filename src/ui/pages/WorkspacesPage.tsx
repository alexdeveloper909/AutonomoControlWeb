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
import { useAuth } from '../auth/AuthProvider'
import { AppShell } from '../components/AppShell'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'
import { WorkspaceCreateDialog } from './WorkspacesPage/WorkspaceCreateDialog'

export function WorkspacesPage() {
  const { session } = useAuth()
  const api = useMemo(() => new AutonomoControlApi(() => session?.tokens.idToken ?? null), [session?.tokens.idToken])
  const navigate = useNavigate()

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
      <AppShell title="Workspaces">
        <Stack spacing={2}>
          <ErrorAlert message={error} />
          <Button variant="contained" onClick={refresh}>
            Retry
          </Button>
        </Stack>
      </AppShell>
    )
  }

  if (!items) return <LoadingScreen />

  return (
    <AppShell
      title="Workspaces"
      right={
        <Button color="inherit" onClick={() => setCreateOpen(true)} startIcon={<AddCircleOutlineIcon />}>
          New
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
                    <Typography variant="h5">No workspaces yet</Typography>
                    <Typography color="text.secondary">
                      Create your first workspace to start tracking records.
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
                    Create workspace
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
