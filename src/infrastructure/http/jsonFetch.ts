import { HttpError } from './httpError'

export type JsonFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export const jsonFetch = async <T>(url: string, options: JsonFetchOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => undefined)
    throw new HttpError(`HTTP ${res.status} for ${url}`, res.status, text)
  }

  // Some endpoints (e.g. 204) might return empty body.
  const text = await res.text()
  if (text.length === 0) return undefined as T
  return JSON.parse(text) as T
}
