import { Navigate, Route, Routes } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceRegularSpendingsDashboardPage } from './WorkspaceRegularSpendingsDashboardPage'
import { WorkspaceRegularSpendingsCreatePage } from './WorkspaceRegularSpendingsCreatePage'
import { WorkspaceRegularSpendingsCreatedPage } from './WorkspaceRegularSpendingsCreatedPage'
import { WorkspaceRegularSpendingsEditPage } from './WorkspaceRegularSpendingsEditPage'
import { WorkspaceRegularSpendingsListPage } from './WorkspaceRegularSpendingsListPage'

export function WorkspaceRegularSpendingsRoutes(props: {
  workspaceId: string
  api: AutonomoControlApi
  readOnly: boolean
}) {
  return (
    <Routes>
      <Route
        index
        element={
          <WorkspaceRegularSpendingsDashboardPage
            workspaceId={props.workspaceId}
            api={props.api}
            readOnly={props.readOnly}
          />
        }
      />
      <Route
        path="new"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/regular-spendings`} replace />
          ) : (
            <WorkspaceRegularSpendingsCreatePage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route
        path=":eventDate/:recordId/edit"
        element={
          props.readOnly ? (
            <Navigate to={`/workspaces/${props.workspaceId}/regular-spendings`} replace />
          ) : (
            <WorkspaceRegularSpendingsEditPage workspaceId={props.workspaceId} api={props.api} />
          )
        }
      />
      <Route path="created" element={<WorkspaceRegularSpendingsCreatedPage workspaceId={props.workspaceId} />} />
      <Route
        path="list"
        element={
          <WorkspaceRegularSpendingsListPage
            workspaceId={props.workspaceId}
            api={props.api}
            readOnly={props.readOnly}
          />
        }
      />
      <Route path="*" element={<Navigate to={`/workspaces/${props.workspaceId}/regular-spendings`} replace />} />
    </Routes>
  )
}
