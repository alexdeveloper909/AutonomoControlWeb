import { Box, CircularProgress, useTheme } from '@mui/material'
import { appGradient } from '../app/theme'

export function LoadingScreen() {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100dvh',
        background: appGradient(theme.palette.mode),
      }}
    >
      <CircularProgress />
    </Box>
  )
}
