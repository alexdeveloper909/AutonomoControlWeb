import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined'
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

/* ---------- feature card data ---------- */

const GITHUB_REPO_URL = 'https://github.com/alexdeveloper909/AutonomoControlWeb'

interface FeatureEntry {
  key: string
  Icon: typeof ReceiptLongOutlinedIcon
  href?: string
}

const featureKeys: readonly FeatureEntry[] = [
  { key: 'tax', Icon: ReceiptLongOutlinedIcon },
  { key: 'summaries', Icon: BarChartOutlinedIcon },
  { key: 'tracking', Icon: AccountBalanceWalletOutlinedIcon },
  { key: 'renta', Icon: SavingsOutlinedIcon },
  { key: 'balance', Icon: AccountBalanceOutlinedIcon },
  { key: 'sharing', Icon: PeopleOutlinedIcon },
  { key: 'free', Icon: MoneyOffOutlinedIcon },
  { key: 'openSource', Icon: CodeOutlinedIcon, href: GITHUB_REPO_URL },
  { key: 'encryption', Icon: LockOutlinedIcon },
]

/* ---------- component ---------- */

export function LandingPage() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* ---- Top bar ---- */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
            AutonomoControl
          </Typography>
          <Button component={RouterLink} to="/login" variant="outlined" size="small">
            {t('landing.nav.signIn')}
          </Button>
        </Toolbar>
      </AppBar>

      {/* ---- Hero ---- */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(160deg, ${theme.palette.primary.dark}22 0%, ${theme.palette.background.default} 60%)`
              : `linear-gradient(160deg, ${theme.palette.primary.light}33 0%, ${theme.palette.background.default} 60%)`,
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography variant="h2" fontWeight={800} sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' } }}>
              {t('landing.hero.title')}
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 640, fontSize: { xs: '1.1rem', md: '1.4rem' } }}>
              {t('landing.hero.subtitle')}
            </Typography>
            <Button component={RouterLink} to="/login" variant="contained" size="large" sx={{ px: 5, py: 1.5, fontSize: '1rem' }}>
              {t('landing.hero.cta')}
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ---- Features ---- */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
            {t('landing.features.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 5, maxWidth: 600, mx: 'auto' }}>
            {t('landing.features.subtitle')}
          </Typography>

          <Grid container spacing={3}>
            {featureKeys.map(({ key, Icon, href }) => {
              const cardInner = (
                <CardContent>
                  <Stack spacing={1.5}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                      <Icon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600}>
                      {t(`landing.features.${key}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(`landing.features.${key}.description`)}
                    </Typography>
                  </Stack>
                </CardContent>
              )

              return (
                <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    {href ? (
                      <CardActionArea
                        component="a"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ height: '100%' }}
                      >
                        {cardInner}
                      </CardActionArea>
                    ) : (
                      cardInner
                    )}
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Container>
      </Box>

      {/* ---- How it works ---- */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'action.hover' }}>
        <Container maxWidth="md">
          <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
            {t('landing.howItWorks.title')}
          </Typography>

          <Stack spacing={4} sx={{ mt: 4 }}>
            {[1, 2, 3].map((step) => (
              <Stack key={step} direction="row" spacing={3} alignItems="flex-start">
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 44,
                    height: 44,
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  {step}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {t(`landing.howItWorks.step${step}.title`)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`landing.howItWorks.step${step}.description`)}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ---- Footer CTA ---- */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="sm">
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h5" fontWeight={700}>
              {t('landing.footer.cta')}
            </Typography>
            <Button component={RouterLink} to="/login" variant="contained" size="large" sx={{ px: 5, py: 1.5 }}>
              {t('landing.hero.cta')}
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ---- Bottom bar ---- */}
      <Box component="footer" sx={{ py: 2, borderTop: 1, borderColor: 'divider', mt: 'auto' }}>
        <Container maxWidth="lg">
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            © {new Date().getFullYear()} AutonomoControl
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
