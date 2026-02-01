import type { PaletteMode } from '@mui/material'
import { createTheme } from '@mui/material/styles'

export function createAppTheme(mode: PaletteMode, direction: 'ltr' | 'rtl') {
  return createTheme({
    direction,
    palette: { mode },
    typography: {
      fontFamily:
        'Roboto, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    },
    components: {
      MuiTableCell: { defaultProps: { size: 'small' } },
    },
  })
}
