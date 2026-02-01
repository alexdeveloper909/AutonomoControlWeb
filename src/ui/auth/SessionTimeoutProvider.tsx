import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { tokenStorage } from '../../infrastructure/auth/tokenStorage'
import { onSessionExpired, type SessionExpiredEvent } from '../../infrastructure/auth/sessionEvents'
import { useAuth } from './useAuth'
import { useTranslation } from 'react-i18next'

const isAuthRoute = (pathname: string): boolean => pathname === '/login' || pathname.startsWith('/auth/')

export function SessionTimeoutProvider(props: PropsWithChildren) {
  const { session, setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [lastEvent, setLastEvent] = useState<SessionExpiredEvent | null>(null)
  const openRef = useRef(false)
  const idToken = session?.tokens.idToken

  const fromPath = useMemo(() => (isAuthRoute(location.pathname) ? '/workspaces' : location.pathname), [location.pathname])

  const show = useCallback(
    (event: SessionExpiredEvent) => {
      if (openRef.current) return
      if (isAuthRoute(location.pathname)) return
      openRef.current = true
      setLastEvent(event)
      setOpen(true)
    },
    [location.pathname],
  )

  useEffect(() => onSessionExpired(show), [show])

  useEffect(() => {
    if (!session) return
    const nowSeconds = Math.floor(Date.now() / 1000)
    const triggerAt = session.tokens.expiresAtEpochSeconds - 30
    const msUntil = (triggerAt - nowSeconds) * 1000
    const id = window.setTimeout(() => {
      show({ source: 'timer', expiresAtEpochSeconds: session.tokens.expiresAtEpochSeconds })
    }, Math.max(0, msUntil))
    return () => window.clearTimeout(id)
  }, [session, show])

  useEffect(() => {
    if (!idToken) return
    const id = window.setTimeout(() => {
      openRef.current = false
      setOpen(false)
      setLastEvent(null)
    }, 0)
    return () => window.clearTimeout(id)
  }, [idToken])

  const onOk = useCallback(() => {
    tokenStorage.clear()
    setSession(null)
    setOpen(false)
    navigate('/login', { replace: true, state: { from: fromPath } })
  }, [fromPath, navigate, setSession])

  return (
    <>
      {props.children}
      <Dialog open={open} onClose={onOk} maxWidth="xs" fullWidth>
        <DialogTitle>{t('sessionTimeout.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('sessionTimeout.body')}
          </Typography>
          {lastEvent?.source === 'http' ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('sessionTimeout.httpHint', { status: lastEvent.status })}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onOk} autoFocus>
            {t('sessionTimeout.ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
