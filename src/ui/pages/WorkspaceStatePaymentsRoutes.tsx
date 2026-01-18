import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceStatePaymentsPage } from './WorkspaceStatePaymentsPage'
import { WorkspaceStatePaymentsCreatePage } from './WorkspaceStatePaymentsCreatePage'
import { WorkspaceStatePaymentsCreatedPage } from './WorkspaceStatePaymentsCreatedPage'

export function WorkspaceStatePaymentsRoutes(props: { workspaceId: string; api: AutonomoControlApi }) {
  return (
    <Routes>
      <Route index element={<WorkspaceStatePaymentsPage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="new" element={<WorkspaceStatePaymentsCreatePage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="created" element={<WorkspaceStatePaymentsCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/state-payments`} replace />} />
    </Routes>
  )
}
