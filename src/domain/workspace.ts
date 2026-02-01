export type WorkspaceRole = 'OWNER' | 'MEMBER' | 'READER'
export type WorkspaceStatus = 'OWNER' | 'ACTIVE' | 'ACCEPTED' | 'INVITED'
export type WorkspaceAccessMode = 'READ_WRITE' | 'READ_ONLY'

export type Workspace = {
  workspaceId: string
  name: string
  role?: WorkspaceRole
  status?: WorkspaceStatus
  accessMode: WorkspaceAccessMode
  sharedByMe?: boolean
  sharedWithMe?: boolean
}
