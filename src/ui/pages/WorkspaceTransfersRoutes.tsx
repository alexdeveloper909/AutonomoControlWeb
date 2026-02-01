import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceTransfersPage } from './WorkspaceTransfersPage'
import { WorkspaceTransfersCreatePage } from './WorkspaceTransfersCreatePage'
import { WorkspaceTransfersCreatedPage } from './WorkspaceTransfersCreatedPage'
import { WorkspaceTransfersEditPage } from './WorkspaceTransfersEditPage'

export function WorkspaceTransfersRoutes(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  return (
    <Routes>
      <Route index element={<WorkspaceTransfersPage workspaceId={props.workspaceId} api={props.api} readOnly={props.readOnly} />} />
      <Route
        path="new"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/transfers`} replace />
          ) : (
            <WorkspaceTransfersCreatePage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route
        path=":eventDate/:recordId/edit"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/transfers`} replace />
          ) : (
            <WorkspaceTransfersEditPage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route path="created" element={<WorkspaceTransfersCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/transfers`} replace />} />
    </Routes>
  )
}
