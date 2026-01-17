import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../application/auth/authService'
import { useAuth } from '../auth/AuthProvider'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'

export function AuthCallbackPage() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const errorParam = url.searchParams.get('error')
      const errorDesc = url.searchParams.get('error_description')

      if (errorParam) {
        setError([errorParam, errorDesc].filter(Boolean).join(': '))
        return
      }
      if (!code || !state) {
        setError('Missing OAuth callback params (code/state)')
        return
      }

      try {
        const session = await authService.finishLogin({ code, state })
        setSession(session)
        navigate('/workspaces', { replace: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    void run()
  }, [navigate, setSession])

  if (error) return <ErrorAlert message={error} />
  return <LoadingScreen />
}
