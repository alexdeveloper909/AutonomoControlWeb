import { Navigate, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceExpensesCreatePage } from './WorkspaceExpensesCreatePage'

export function WorkspaceExpensesEditPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const params = useParams()
  const eventDate = params.eventDate
  const recordId = params.recordId
  if (!eventDate || !recordId) return <Navigate to={`/workspaces/${props.workspaceId}/expenses`} replace />
  return <WorkspaceExpensesCreatePage workspaceId={props.workspaceId} api={props.api} mode="edit" eventDate={eventDate} recordId={recordId} />
}

