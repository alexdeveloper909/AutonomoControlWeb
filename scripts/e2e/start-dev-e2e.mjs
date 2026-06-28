#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { ensureTestUser } from './lib/cognito-test-user.mjs'
import {
  decodeJwtClaims,
  resolveConfig,
  runAwsJsonWithCliInput,
  webRoot,
} from './lib/e2e-env.mjs'
import { grantWorkspaceAccess } from './lib/workspace-membership.mjs'

const getAuthTokens = (config) => {
  try {
    const response = runAwsJsonWithCliInput(config, ['cognito-idp', 'initiate-auth'], {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.clientId,
      AuthParameters: {
        USERNAME: config.testUserEmail,
        PASSWORD: config.testUserPassword,
      },
    })

    const result = response.AuthenticationResult
    if (!result?.IdToken || !result?.AccessToken) {
      const challenge = response.ChallengeName ? ` Challenge: ${response.ChallengeName}.` : ''
      throw new Error(`Cognito did not return tokens.${challenge}`)
    }

    const claims = decodeJwtClaims(result.IdToken)
    if (!claims.exp) throw new Error('Cognito id token is missing exp claim')

    return {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
      expiresAtEpochSeconds: claims.exp,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('USER_PASSWORD_AUTH') || message.includes('not enabled')) {
      throw new Error(
        `${message}\n\nDeploy the CDK change that enables Cognito USER_PASSWORD_AUTH for the web app client, then retry.`,
      )
    }
    throw e
  }
}

try {
  const config = resolveConfig()
  const user = ensureTestUser(config)
  grantWorkspaceAccess(config, user)

  const tokens = getAuthTokens(config)
  const env = {
    ...process.env,
    ...config.env,
    VITE_E2E_AUTH_ENABLED: 'true',
    VITE_E2E_AUTH_TOKENS_JSON: JSON.stringify(tokens),
    VITE_E2E_AUTH_REDIRECT: config.bootstrapRedirect,
  }
  delete env.E2E_TEST_USER_PASSWORD

  console.log(`Ensured e2e user access to: ${config.workspaceName}`)
  console.log('Starting Vite dev server for e2e browser testing...')
  console.log('After Vite is ready, open: http://localhost:5173/__e2e__/auth')

  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(npmBin, ['run', 'dev:dev'], {
    cwd: webRoot,
    env,
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}
