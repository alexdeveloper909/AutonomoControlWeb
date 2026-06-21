import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceBusinessEntityInvoicesPage } from './WorkspaceBusinessEntityInvoicesPage'
import { WorkspaceBusinessEntityInvoiceCreatePage } from './WorkspaceBusinessEntityInvoiceCreatePage'
import { WorkspaceBusinessEntityInvoiceEditPage } from './WorkspaceBusinessEntityInvoiceEditPage'
import { WorkspaceBusinessEntitySummaryPage } from './WorkspaceBusinessEntitySummaryPage'

export function WorkspaceBusinessEntityRoutes(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const params = useParams()
  const entityId = params.entityId
  if (!entityId) return <Navigate to={`/workspaces/${props.workspaceId}/income`} replace />
  const basePath = `/workspaces/${props.workspaceId}/business-entities/${entityId}`

  return (
    <Routes>
      <Route index element={<Navigate to={`${basePath}/invoices`} replace />} />
      <Route path="invoices" element={<WorkspaceBusinessEntityInvoicesPage workspaceId={props.workspaceId} entityId={entityId} api={props.api} readOnly={props.readOnly} />} />
      <Route
        path="invoices/new"
        element={
          props.readOnly ? (
            <Navigate to={`${basePath}/invoices`} replace />
          ) : (
            <WorkspaceBusinessEntityInvoiceCreatePage workspaceId={props.workspaceId} entityId={entityId} api={props.api} />
          )
        }
      />
      <Route
        path="invoices/:eventDate/:recordId/edit"
        element={
          props.readOnly ? (
            <Navigate to={`${basePath}/invoices`} replace />
          ) : (
            <WorkspaceBusinessEntityInvoiceEditPage workspaceId={props.workspaceId} entityId={entityId} api={props.api} />
          )
        }
      />
      <Route path="summary" element={<WorkspaceBusinessEntitySummaryPage workspaceId={props.workspaceId} entityId={entityId} api={props.api} />} />
      <Route path="*" element={<Navigate to={`${basePath}/invoices`} replace />} />
    </Routes>
  )
}
