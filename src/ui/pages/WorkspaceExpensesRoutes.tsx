import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceExpensesPage } from './WorkspaceExpensesPage'
import { WorkspaceExpensesCreatePage } from './WorkspaceExpensesCreatePage'
import { WorkspaceExpensesCreatedPage } from './WorkspaceExpensesCreatedPage'
import { WorkspaceExpensesEditPage } from './WorkspaceExpensesEditPage'

export function WorkspaceExpensesRoutes(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  return (
    <Routes>
      <Route index element={<WorkspaceExpensesPage workspaceId={props.workspaceId} api={props.api} readOnly={props.readOnly} />} />
      <Route
        path="new"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/expenses`} replace />
          ) : (
            <WorkspaceExpensesCreatePage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route
        path=":eventDate/:recordId/edit"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/expenses`} replace />
          ) : (
            <WorkspaceExpensesEditPage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route path="created" element={<WorkspaceExpensesCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/expenses`} replace />} />
    </Routes>
  )
}
