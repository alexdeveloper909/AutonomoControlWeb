#!/usr/bin/env node
import { ensureTestUser } from './lib/cognito-test-user.mjs'
import { resolveConfig } from './lib/e2e-env.mjs'
import { grantWorkspaceAccess } from './lib/workspace-membership.mjs'

try {
  const config = resolveConfig()
  const user = ensureTestUser(config)
  grantWorkspaceAccess(config, user)

  console.log(`Ensured Cognito test user: ${user.email}`)
  console.log(`Granted ${config.workspaceRole} access to workspace: ${config.workspaceName}`)
  console.log(`Workspace id: ${config.workspaceId}`)
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}
