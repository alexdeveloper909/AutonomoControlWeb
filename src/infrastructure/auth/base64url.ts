export const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export const base64UrlEncodeString = (text: string): string =>
  base64UrlEncode(new TextEncoder().encode(text))
