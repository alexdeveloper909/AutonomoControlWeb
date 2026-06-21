import { Navigate, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceBusinessEntityInvoiceCreatePage } from './WorkspaceBusinessEntityInvoiceCreatePage'

export function WorkspaceBusinessEntityInvoiceEditPage(props: { workspaceId: string; entityId: string; api: AutonomoControlApi }) {
  const params = useParams()
  const eventDate = params.eventDate
  const recordId = params.recordId
  if (!eventDate || !recordId) return <Navigate to={`/workspaces/${props.workspaceId}/business-entities/${props.entityId}/invoices`} replace />
  return (
    <WorkspaceBusinessEntityInvoiceCreatePage
      workspaceId={props.workspaceId}
      entityId={props.entityId}
      api={props.api}
      mode="edit"
      eventDate={eventDate}
      recordId={recordId}
    />
  )
}
