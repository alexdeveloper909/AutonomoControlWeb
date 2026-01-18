import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceIncomePage } from './WorkspaceIncomePage'
import { WorkspaceIncomeCreatePage } from './WorkspaceIncomeCreatePage'
import { WorkspaceIncomeCreatedPage } from './WorkspaceIncomeCreatedPage'

export function WorkspaceIncomeRoutes(props: { workspaceId: string; api: AutonomoControlApi }) {
  return (
    <Routes>
      <Route index element={<WorkspaceIncomePage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="new" element={<WorkspaceIncomeCreatePage workspaceId={props.workspaceId} api={props.api} />} />
      <Route path="created" element={<WorkspaceIncomeCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/income`} replace />} />
    </Routes>
  )
}
