import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'

export function AppShell(props: PropsWithChildren<{ title: string; right?: ReactNode; nav?: ReactNode }>) {
  const { logout } = useAuth()

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {props.title}
          </Typography>
          {props.right}
          <Button color="inherit" onClick={logout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {props.nav ? (
          <Box
            component="nav"
            aria-label="Navigation"
            sx={{
              width: 280,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'auto',
            }}
          >
            {props.nav}
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <Container sx={{ py: 3 }}>{props.children}</Container>
        </Box>
      </Box>
    </Box>
  )
}
