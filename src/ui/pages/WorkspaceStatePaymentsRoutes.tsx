import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceStatePaymentsPage } from './WorkspaceStatePaymentsPage'
import { WorkspaceStatePaymentsCreatePage } from './WorkspaceStatePaymentsCreatePage'
import { WorkspaceStatePaymentsCreatedPage } from './WorkspaceStatePaymentsCreatedPage'
import { WorkspaceStatePaymentsEditPage } from './WorkspaceStatePaymentsEditPage'

export function WorkspaceStatePaymentsRoutes(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  return (
    <Routes>
      <Route
        index
        element={<WorkspaceStatePaymentsPage workspaceId={props.workspaceId} api={props.api} readOnly={props.readOnly} />}
      />
      <Route
        path="new"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/state-payments`} replace />
          ) : (
            <WorkspaceStatePaymentsCreatePage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route
        path=":eventDate/:recordId/edit"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/state-payments`} replace />
          ) : (
            <WorkspaceStatePaymentsEditPage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route path="created" element={<WorkspaceStatePaymentsCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/state-payments`} replace />} />
    </Routes>
  )
}
