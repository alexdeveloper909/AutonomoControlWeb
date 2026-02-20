import { Box, Button, Container, Paper, Stack, Typography, useTheme } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { env } from '../../infrastructure/config/env'
import { useTranslation } from 'react-i18next'
import { appGradient } from '../app/theme'

export function LoginPage() {
  const { startLogin } = useAuth()
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: appGradient(theme.palette.mode),
      }}
    >
      <Box sx={{ py: 2, px: 3 }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h6"
          sx={{
            fontWeight: 700,
            textDecoration: 'none',
            color: 'text.primary',
          }}
        >
          AutonomoControl
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <Container maxWidth="xs">
          <Paper
            variant="outlined"
            sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}
          >
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h5" fontWeight={700}>
                  {t('login.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('login.subtitle', { defaultValue: '' }) || undefined}
                </Typography>
              </Stack>
              <Button
                variant="contained"
                size="large"
                onClick={startLogin}
                sx={{ py: 1.5 }}
              >
                {t('login.continueWith', { provider: env.cognitoIdentityProvider ?? 'Cognito' })}
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  )
}
