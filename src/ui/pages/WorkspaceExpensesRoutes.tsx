import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceExpensesPage } from './WorkspaceExpensesPage'
import { WorkspaceExpensesCreatePage } from './WorkspaceExpensesCreatePage'
import { WorkspaceExpensesCreatedPage } from './WorkspaceExpensesCreatedPage'

export function WorkspaceExpensesRoutes(props: { workspaceId: string; api: AutonomoControlApi }) {
  return (
    <Routes>
      <Route index element={<WorkspaceExpensesPage workspaceId={props.workspaceId} />} />
      <Route path="new" element={<WorkspaceExpensesCreatePage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="created" element={<WorkspaceExpensesCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/expenses`} replace />} />
    </Routes>
  )
}

