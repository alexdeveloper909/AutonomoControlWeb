import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const libDir = path.dirname(fileURLToPath(import.meta.url))
export const webRoot = path.resolve(libDir, '../../..')

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return {}
  const values = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
    const eq = withoutExport.indexOf('=')
    if (eq <= 0) continue

    const key = withoutExport.slice(0, eq).trim()
    let value = withoutExport.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

export const loadProjectEnv = () => {
  const files = ['.env', '.env.local', '.env.dev', '.env.dev.local', '.env.e2e.local']
  const fileEnv = files.reduce(
    (acc, file) => ({ ...acc, ...parseEnvFile(path.join(webRoot, file)) }),
    {},
  )
  return { ...fileEnv, ...process.env }
}

const requireValue = (env, key) => {
  const value = env[key]?.trim()
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

const inferRegion = (env) => {
  const explicit = env.E2E_AWS_REGION || env.AWS_REGION || env.AWS_DEFAULT_REGION
  if (explicit?.trim()) return explicit.trim()

  const domain = env.VITE_COGNITO_DOMAIN ?? ''
  const match = domain.match(/\.auth\.([a-z0-9-]+)\.amazoncognito\.com/i)
  if (match?.[1]) return match[1]

  throw new Error('Missing AWS region. Set E2E_AWS_REGION in .env.e2e.local.')
}

export const resolveConfig = () => {
  const env = loadProjectEnv()
  const workspaceId = env.E2E_WORKSPACE_ID?.trim() || '83e079dc-9385-47e5-bef2-56f349b36acd'

  return {
    env,
    region: inferRegion(env),
    userPoolId: requireValue(env, 'E2E_COGNITO_USER_POOL_ID'),
    clientId: requireValue(env, 'VITE_COGNITO_CLIENT_ID'),
    testUserEmail: requireValue(env, 'E2E_TEST_USER_EMAIL').toLowerCase(),
    testUserPassword: requireValue(env, 'E2E_TEST_USER_PASSWORD'),
    workspaceId,
    workspaceName: env.E2E_WORKSPACE_NAME?.trim() || 'My workspace test',
    workspaceMembersTable:
      env.E2E_WORKSPACE_MEMBERS_TABLE?.trim() || 'autonomo-control-dev-workspace_members',
    workspaceRole: env.E2E_WORKSPACE_ROLE?.trim() || 'MEMBER',
    bootstrapRedirect: env.E2E_AUTH_REDIRECT?.trim() || '/workspaces',
  }
}

export const runAwsJson = (config, args, options = {}) => {
  const result = spawnSync(
    'aws',
    ['--region', config.region, ...args, '--output', 'json'],
    {
      cwd: webRoot,
      encoding: 'utf8',
      input: options.input,
      env: { ...process.env, ...config.env },
    },
  )

  if (result.error) throw result.error
  if (result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `aws exited ${result.status}`
    throw new Error(message)
  }

  const stdout = result.stdout.trim()
  return stdout ? JSON.parse(stdout) : {}
}

export const runAwsJsonWithCliInput = (config, serviceArgs, payload) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'autonomo-e2e-'))
  const filePath = path.join(dir, 'input.json')
  try {
    writeFileSync(filePath, JSON.stringify(payload), { mode: 0o600 })
    return runAwsJson(config, [...serviceArgs, '--cli-input-json', `file://${filePath}`])
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
}

export const decodeJwtClaims = (jwt) => {
  const [, payload] = jwt.split('.')
  if (!payload) throw new Error('Invalid JWT returned by Cognito')
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'))
}
