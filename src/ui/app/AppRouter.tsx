import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthCallbackPage } from '../pages/AuthCallbackPage'
import { LoginPage } from '../pages/LoginPage'
import { WorkspacesPage } from '../pages/WorkspacesPage'
import { RequireAuth } from '../auth/RequireAuth'
import { WorkspaceLayoutPage } from '../pages/WorkspaceLayoutPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/workspaces/:workspaceId/*" element={<WorkspaceLayoutPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  )
}
