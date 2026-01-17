import { base64UrlEncode } from './base64url'

export const randomString = (bytesLength: number): string => {
  const bytes = new Uint8Array(bytesLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export const sha256Base64Url = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return base64UrlEncode(new Uint8Array(digest))
}
