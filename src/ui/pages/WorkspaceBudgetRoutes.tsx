import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceBudgetEntriesPage } from './WorkspaceBudgetEntriesPage'
import { WorkspaceBudgetCreatePage } from './WorkspaceBudgetCreatePage'
import { WorkspaceBudgetCreatedPage } from './WorkspaceBudgetCreatedPage'

export function WorkspaceBudgetRoutes(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  return (
    <Routes>
      <Route index element={<WorkspaceBudgetEntriesPage workspaceId={props.workspaceId} api={props.api} readOnly={props.readOnly} />} />
      <Route
        path="new"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/budget`} replace />
          ) : (
            <WorkspaceBudgetCreatePage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route path="created" element={<WorkspaceBudgetCreatedPage workspaceId={props.workspaceId} />} />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/budget`} replace />} />
    </Routes>
  )
}
