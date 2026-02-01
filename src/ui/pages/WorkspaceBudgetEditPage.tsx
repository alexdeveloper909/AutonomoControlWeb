import { Navigate, useParams } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { WorkspaceBudgetCreatePage } from './WorkspaceBudgetCreatePage'

export function WorkspaceBudgetEditPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const params = useParams()
  const eventDate = params.eventDate
  const recordId = params.recordId
  if (!eventDate || !recordId) return <Navigate to={`/workspaces/${props.workspaceId}/budget`} replace />
  return <WorkspaceBudgetCreatePage workspaceId={props.workspaceId} api={props.api} mode="edit" eventDate={eventDate} recordId={recordId} />
}

