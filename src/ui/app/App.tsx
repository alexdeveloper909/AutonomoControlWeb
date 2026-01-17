import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { AppRouter } from './AppRouter'
import { appTheme } from './theme'

export function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
