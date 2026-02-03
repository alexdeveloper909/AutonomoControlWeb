import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { env } from '../../infrastructure/config/env'
import { useTranslation } from 'react-i18next'

export function LoginPage() {
  const { startLogin } = useAuth()
  const { t } = useTranslation()

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5">{t('login.title')}</Typography>
            <Button variant="contained" onClick={startLogin}>
              {t('login.continueWith', { provider: env.cognitoIdentityProvider ?? 'Cognito' })}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
