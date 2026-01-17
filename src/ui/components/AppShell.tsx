import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'

export function AppShell(props: PropsWithChildren<{ title: string; right?: ReactNode }>) {
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
      <Container sx={{ py: 3, flex: 1 }}>{props.children}</Container>
    </Box>
  )
}
