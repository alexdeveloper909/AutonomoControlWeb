import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceTransfersPage } from './WorkspaceTransfersPage'
import { WorkspaceTransfersCreatePage } from './WorkspaceTransfersCreatePage'
import { WorkspaceTransfersCreatedPage } from './WorkspaceTransfersCreatedPage'

export function WorkspaceTransfersRoutes(props: { workspaceId: string; api: AutonomoControlApi }) {
  return (
    <Routes>
      <Route index element={<WorkspaceTransfersPage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="new" element={<WorkspaceTransfersCreatePage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="created" element={<WorkspaceTransfersCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/transfers`} replace />} />
    </Routes>
  )
}
