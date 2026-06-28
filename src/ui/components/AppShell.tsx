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
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
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

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0 }}>
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
            pb: hasMobileNavigation ? { xs: 7, md: 0 } : 0,
          }}
        >
          <Container sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>{props.children}</Container>
        </Box>
      </Box>
      {hasMobileNavigation ? (
        <>
          <BottomNavigation
            showLabels
            sx={{
              display: { xs: 'flex', md: 'none' },
              position: 'fixed',
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: theme.zIndex.appBar,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
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
                sx={{ color: item.selected ? 'primary.main' : 'text.secondary' }}
              />
            ))}
            {mobileMoreSections.length ? (
              <BottomNavigationAction
                label={t('common.more')}
                icon={<MoreHorizOutlinedIcon />}
                onClick={() => setMoreOpen(true)}
              />
            ) : null}
          </BottomNavigation>
          <Drawer
            anchor="bottom"
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            PaperProps={{
              sx: {
                display: { xs: 'block', md: 'none' },
                maxHeight: '82dvh',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              },
            }}
          >
            <Box sx={{ py: 1 }}>
              {mobileMoreSections.map((section, sectionIndex) => (
                <Box key={section.title}>
                  {sectionIndex > 0 ? <Divider /> : null}
                  <List
                    subheader={
                      <ListSubheader component="div" sx={{ bgcolor: 'background.paper' }}>
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
                      >
                        {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
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
