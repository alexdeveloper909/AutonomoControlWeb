import { Navigate, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceTransfersCreatePage } from './WorkspaceTransfersCreatePage'

export function WorkspaceTransfersEditPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const params = useParams()
  const eventDate = params.eventDate
  const recordId = params.recordId
  if (!eventDate || !recordId) return <Navigate to={`/workspaces/${props.workspaceId}/transfers`} replace />
  return <WorkspaceTransfersCreatePage workspaceId={props.workspaceId} api={props.api} mode="edit" eventDate={eventDate} recordId={recordId} />
}

