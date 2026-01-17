export type WorkspaceRole = 'OWNER' | 'MEMBER'
export type WorkspaceStatus = 'OWNER' | 'ACTIVE' | 'ACCEPTED' | 'INVITED'

export type Workspace = {
  workspaceId: string
  name: string
  role?: WorkspaceRole
  status?: WorkspaceStatus
}
