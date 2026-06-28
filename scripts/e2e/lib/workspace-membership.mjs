import { runAwsJsonWithCliInput } from './e2e-env.mjs'

export const grantWorkspaceAccess = (config, user) => {
  const now = new Date().toISOString()
  const item = {
    workspace_id: { S: config.workspaceId },
    member_key: { S: `USER#${user.sub}` },
    user_id: { S: user.sub },
    email_lower: { S: user.email },
    role: { S: config.workspaceRole },
    status: { S: 'ACTIVE' },
    created_at: { S: now },
    updated_at: { S: now },
    source: { S: 'e2e' },
  }

  runAwsJsonWithCliInput(config, ['dynamodb', 'put-item'], {
    TableName: config.workspaceMembersTable,
    Item: item,
  })
}
