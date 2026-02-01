import { Navigate, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceIncomeCreatePage } from './WorkspaceIncomeCreatePage'

export function WorkspaceIncomeEditPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const params = useParams()
  const eventDate = params.eventDate
  const recordId = params.recordId
  if (!eventDate || !recordId) return <Navigate to={`/workspaces/${props.workspaceId}/income`} replace />
  return <WorkspaceIncomeCreatePage workspaceId={props.workspaceId} api={props.api} mode="edit" eventDate={eventDate} recordId={recordId} />
}

