import type { AppLanguage } from './language'

export type UserMe = {
  userId: string
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  preferredLanguage?: AppLanguage | null
}

