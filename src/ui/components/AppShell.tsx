import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { PropsWithChildren, ReactNode } from 'react'
import { useState } from 'react'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useTranslation } from 'react-i18next'
import { useUserSettings } from '../user/userSettingsContext'
import { appGradient } from '../app/theme'

export type AppShellMobileNavItem = {
  label: string
  to: string
  selected?: boolean
  icon?: ReactNode
}

export type AppShellMoreItem = {
  label: string
  to?: string
  selected?: boolean
  icon?: ReactNode
  onClick?: () => void
}

export type AppShellMoreSection = {
  title: string
  items: AppShellMoreItem[]
}

export function AppShell(
  props: PropsWithChildren<{
    title: string
    right?: ReactNode
    nav?: ReactNode
    mobileNavItems?: AppShellMobileNavItem[]
    mobileMoreSections?: AppShellMoreSection[]
    hideDefaultAccountActions?: boolean
  }>,
) {
  const { logout } = useAuth()
  const { t } = useTranslation()
  const { openSettings } = useUserSettings()
  const theme = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)
  const mobileNavItems = props.mobileNavItems ?? []
  const mobileMoreSections = props.mobileMoreSections ?? []
  const hasMobileNavigation = mobileNavItems.length > 0 || mobileMoreSections.length > 0

  const mobileNavHeight = 82

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        sx={{
          boxShadow: { xs: `0 10px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.08)}`, md: 'none' },
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 0.75, sm: 1 },
            minWidth: 0,
            minHeight: { xs: 58, sm: 64 },
            px: { xs: 1.5, sm: 2 },
          }}
        >
          <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {props.title}
          </Typography>
          {props.right}
          {props.hideDefaultAccountActions ? null : (
            <>
              <IconButton color="inherit" onClick={openSettings} aria-label={t('common.userSettings')}>
                <ManageAccountsOutlinedIcon />
              </IconButton>
              <Button color="inherit" onClick={logout}>
                {t('appShell.signOut')}
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {props.nav ? (
          <Box
            component="nav"
            aria-label={t('common.navigation')}
            sx={{
              width: 280,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'auto',
              display: { xs: hasMobileNavigation ? 'none' : 'block', md: 'block' },
            }}
          >
            {props.nav}
          </Box>
        ) : null}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            background: appGradient(theme.palette.mode),
            pb: hasMobileNavigation ? { xs: `${mobileNavHeight + 18}px`, md: 0 } : 0,
          }}
        >
          <Container
            sx={{
              px: { xs: 1.5, sm: 3 },
              py: { xs: 1.5, sm: 3 },
              maxWidth: { xs: '100%', lg: 1200 },
            }}
          >
            {props.children}
          </Container>
        </Box>
      </Box>
      {hasMobileNavigation ? (
        <>
          <Paper
            elevation={0}
            sx={{
              display: { xs: 'flex', md: 'none' },
              position: 'fixed',
              right: 12,
              bottom: 10,
              left: 12,
              zIndex: theme.zIndex.appBar,
              borderTop: 1,
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.86 : 0.92),
              boxShadow: `0 16px 36px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.14)}`,
              backdropFilter: 'blur(16px)',
              overflow: 'hidden',
            }}
          >
            <BottomNavigation
              showLabels
              value={mobileNavItems.find((item) => item.selected)?.to ?? (moreOpen ? '__more' : false)}
              sx={{
                width: '100%',
                height: mobileNavHeight - 20,
                bgcolor: 'transparent',
                p: 1,
                gap: 0.5,
                '& .MuiBottomNavigationAction-root': {
                  minWidth: 0,
                  borderRadius: 2,
                  color: 'text.secondary',
                  px: 0.5,
                  transition: theme.transitions.create(['background-color', 'color'], { duration: theme.transitions.duration.shorter }),
                },
                '& .MuiBottomNavigationAction-label': {
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                },
                '& .Mui-selected': {
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.11),
                  fontWeight: 700,
                },
              }}
            >
              {mobileNavItems.map((item) => (
                <BottomNavigationAction
                  key={item.to}
                  label={item.label}
                  icon={item.icon}
                  component={RouterLink}
                  to={item.to}
                  value={item.to}
                />
              ))}
              {mobileMoreSections.length ? (
                <BottomNavigationAction
                  label={t('common.more')}
                  icon={<MoreHorizOutlinedIcon />}
                  value="__more"
                  onClick={() => setMoreOpen(true)}
                />
              ) : null}
            </BottomNavigation>
          </Paper>
          <Drawer
            anchor="bottom"
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            ModalProps={{
              slotProps: {
                backdrop: {
                  sx: {
                    bgcolor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.56 : 0.28),
                    backdropFilter: 'blur(2px)',
                  },
                },
              },
            }}
            PaperProps={{
              sx: {
                display: { xs: 'block', md: 'none' },
                maxHeight: '76dvh',
                mx: 1.5,
                mb: `${mobileNavHeight + 18}px`,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                boxShadow: `0 22px 54px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.46 : 0.18)}`,
                overflow: 'hidden',
              },
            }}
          >
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {t('common.more')}
              </Typography>
            </Box>
            <Box sx={{ px: 1, pb: 1.5, overflow: 'auto' }}>
              {mobileMoreSections.map((section, sectionIndex) => (
                <Box key={section.title}>
                  {sectionIndex > 0 ? <Divider sx={{ my: 1 }} /> : null}
                  <List
                    dense
                    subheader={
                      <ListSubheader
                        component="div"
                        sx={{
                          bgcolor: 'background.paper',
                          color: 'text.secondary',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          lineHeight: '32px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {section.title}
                      </ListSubheader>
                    }
                  >
                    {section.items.map((item) => (
                      <ListItemButton
                        key={`${section.title}-${item.label}`}
                        component={item.to ? RouterLink : 'button'}
                        to={item.to}
                        selected={item.selected}
                        onClick={() => {
                          setMoreOpen(false)
                          item.onClick?.()
                        }}
                        sx={{
                          minHeight: 48,
                          borderRadius: 2,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                          },
                        }}
                      >
                        {item.icon ? <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon> : null}
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              ))}
            </Box>
          </Drawer>
        </>
      ) : null}
    </Box>
  )
}
