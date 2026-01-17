export type JwtClaims = {
  sub?: string
  email?: string
  exp?: number
}

const base64UrlDecodeToString = (base64Url: string): string => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}

export const decodeJwtClaims = (jwt: string): JwtClaims => {
  const parts = jwt.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT')
  const json = base64UrlDecodeToString(parts[1]!)
  return JSON.parse(json) as JwtClaims
}
