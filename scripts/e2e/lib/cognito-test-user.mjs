import { runAwsJson, runAwsJsonWithCliInput } from './e2e-env.mjs'

const getAttribute = (user, name) => {
  const attr = user.UserAttributes?.find((a) => a.Name === name)
  return attr?.Value
}

const adminGetUser = (config) => {
  try {
    return runAwsJson(config, [
      'cognito-idp',
      'admin-get-user',
      '--user-pool-id',
      config.userPoolId,
      '--username',
      config.testUserEmail,
    ])
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('UserNotFoundException')) return null
    throw e
  }
}

export const ensureTestUser = (config) => {
  let user = adminGetUser(config)

  if (!user) {
    runAwsJson(config, [
      'cognito-idp',
      'admin-create-user',
      '--user-pool-id',
      config.userPoolId,
      '--username',
      config.testUserEmail,
      '--user-attributes',
      `Name=email,Value=${config.testUserEmail}`,
      'Name=email_verified,Value=true',
      '--message-action',
      'SUPPRESS',
    ])
  } else {
    runAwsJson(config, [
      'cognito-idp',
      'admin-update-user-attributes',
      '--user-pool-id',
      config.userPoolId,
      '--username',
      config.testUserEmail,
      '--user-attributes',
      `Name=email,Value=${config.testUserEmail}`,
      'Name=email_verified,Value=true',
    ])
  }

  runAwsJsonWithCliInput(config, ['cognito-idp', 'admin-set-user-password'], {
    UserPoolId: config.userPoolId,
    Username: config.testUserEmail,
    Password: config.testUserPassword,
    Permanent: true,
  })

  user = adminGetUser(config)
  const sub = user ? getAttribute(user, 'sub') : undefined
  if (!sub) throw new Error('Cognito test user is missing sub attribute')

  return {
    sub,
    email: config.testUserEmail,
  }
}
