import type { PaletteMode } from '@mui/material'
import { alpha, createTheme } from '@mui/material/styles'

export function createAppTheme(mode: PaletteMode, direction: 'ltr' | 'rtl') {
  const isDark = mode === 'dark'

  return createTheme({
    direction,
    palette: {
      mode,
      primary: {
        main: '#3d6ef5',
        light: '#6b93ff',
        dark: '#2a4ec2',
      },
      background: isDark
        ? { default: '#0f1218', paper: '#181d27' }
        : { default: '#f5f7fb', paper: '#ffffff' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        'Roboto, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      h6: { fontWeight: 600 },
    },
    components: {
      MuiTableCell: { defaultProps: { size: 'small' } },

      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.background.paper, 0.75),
            backdropFilter: 'blur(12px)',
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
          containedPrimary: ({ theme }) => ({
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
            },
          }),
        },
      },

      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: alpha(theme.palette.divider, 0.6),
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }),
        },
      },

      MuiPaper: {
        styleOverrides: {
          outlined: ({ theme }) => ({
            borderColor: alpha(theme.palette.divider, 0.6),
          }),
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
            margin: '2px 8px',
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.10),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.16),
              },
            },
          }),
        },
      },
    },
  })
}

export function appGradient(mode: PaletteMode): string {
  return mode === 'dark'
    ? 'linear-gradient(160deg, rgba(61,110,245,0.08) 0%, rgba(15,18,24,0) 60%)'
    : 'linear-gradient(160deg, rgba(61,110,245,0.07) 0%, rgba(245,247,251,0) 60%)'
}
