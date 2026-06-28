import { Navigate, Route, Routes } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AuthCallbackPage } from '../pages/AuthCallbackPage'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { WorkspacesPage } from '../pages/WorkspacesPage'
import { RequireAuth } from '../auth/RequireAuth'
import { WorkspaceLayoutPage } from '../pages/WorkspaceLayoutPage'
import { E2eAuthBootstrapPage } from '../pages/E2eAuthBootstrapPage'

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)

export function AppRouter() {
  return (
    <SentryRoutes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/__e2e__/auth" element={<E2eAuthBootstrapPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/workspaces/:workspaceId/*" element={<WorkspaceLayoutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </SentryRoutes>
  )
}
