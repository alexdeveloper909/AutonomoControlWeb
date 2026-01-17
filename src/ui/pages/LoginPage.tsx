import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { env } from '../../infrastructure/config/env'

export function LoginPage() {
  const { startLogin } = useAuth()

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5">AutonomoControl</Typography>
            <Typography variant="body2" color="text.secondary">
              Stage: {env.appStage}
            </Typography>
            <Button variant="contained" onClick={startLogin}>
              Continue with {env.cognitoIdentityProvider ?? 'Cognito'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              If login fails, verify `VITE_COGNITO_*` env vars and that the Cognito App Client allows your callback URL.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
