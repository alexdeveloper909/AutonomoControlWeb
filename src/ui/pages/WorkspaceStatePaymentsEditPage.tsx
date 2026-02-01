import { Navigate, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceStatePaymentsCreatePage } from './WorkspaceStatePaymentsCreatePage'

export function WorkspaceStatePaymentsEditPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const params = useParams()
  const eventDate = params.eventDate
  const recordId = params.recordId
  if (!eventDate || !recordId) return <Navigate to={`/workspaces/${props.workspaceId}/state-payments`} replace />
  return (
    <WorkspaceStatePaymentsCreatePage workspaceId={props.workspaceId} api={props.api} mode="edit" eventDate={eventDate} recordId={recordId} />
  )
}

