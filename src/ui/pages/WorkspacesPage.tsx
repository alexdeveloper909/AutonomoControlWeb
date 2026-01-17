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
      if (ws.length === 0) setCreateOpen(true)
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
        <Button color="inherit" onClick={() => setCreateOpen(true)}>
          Create
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
        <Box sx={{ mt: 2 }}>
          <Typography color="text.secondary">
            No workspaces yet. Create your first workspace to start tracking records.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((w) => (
            <Grid key={w.workspaceId} item xs={12} sm={6} md={4}>
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
