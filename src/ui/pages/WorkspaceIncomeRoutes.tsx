import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceIncomePage } from './WorkspaceIncomePage'
import { WorkspaceIncomeCreatePage } from './WorkspaceIncomeCreatePage'
import { WorkspaceIncomeCreatedPage } from './WorkspaceIncomeCreatedPage'
import { WorkspaceIncomeEditPage } from './WorkspaceIncomeEditPage'

export function WorkspaceIncomeRoutes(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  return (
    <Routes>
      <Route index element={<WorkspaceIncomePage workspaceId={props.workspaceId} api={props.api} readOnly={props.readOnly} />} />
      <Route
        path="new"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/income`} replace />
          ) : (
            <WorkspaceIncomeCreatePage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route
        path=":eventDate/:recordId/edit"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/income`} replace />
          ) : (
            <WorkspaceIncomeEditPage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route path="created" element={<WorkspaceIncomeCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/income`} replace />} />
    </Routes>
  )
}
