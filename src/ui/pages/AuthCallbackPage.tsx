import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../application/auth/authService'
import { useAuth } from '../auth/useAuth'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'

export function AuthCallbackPage() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const run = async () => {
      const url = new URL(window.location.href)
      const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
      const code = url.searchParams.get('code') ?? hashParams.get('code')
      const state = url.searchParams.get('state') ?? hashParams.get('state')
      const errorParam = url.searchParams.get('error')
      const errorDesc = url.searchParams.get('error_description')

      if (errorParam) {
        setError([errorParam, errorDesc].filter(Boolean).join(': '))
        return
      }
      if (!code || !state) {
        setError(
          [
            'Missing OAuth callback params (code/state).',
            'If this happens only on GitHub Pages/mobile, verify Cognito is returning the code in the URL (response_mode=query).',
            'The form_post (POST) response mode is not compatible with static hosting deep-link shims.',
          ].join(' '),
        )
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
