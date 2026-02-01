import { HttpError } from './httpError'
import { notifySessionExpired } from '../auth/sessionEvents'
import { env } from '../config/env'
import { logger, metrics } from '../sentry'

export type JsonFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

const nowMs = (): number => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now())

const safePathname = (url: string): string => {
  try {
    return new URL(url, window.location.origin).pathname
  } catch {
    return url
  }
}

const normalizeApiPathname = (pathname: string): string => pathname.replace(/\/workspaces\/[^/]+/g, '/workspaces/:workspaceId')

export const jsonFetch = async <T>(url: string, options: JsonFetchOptions = {}): Promise<T> => {
  const startedAt = nowMs()
  const method = (options.method ?? 'GET').toUpperCase()
  const pathname = normalizeApiPathname(safePathname(url))

  const headers = new Headers(options.headers)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (e) {
    if (env.sentryDsn && env.sentryEnableLogs) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.error('HTTP request failed (fetch threw)', { method, pathname, message: msg })
    }
    if (env.sentryDsn && env.sentryEnableMetrics) {
      metrics.count('http.client.request', 1, { attributes: { method, pathname, outcome: 'exception' } })
    }
    const msg =
      e instanceof Error ? e.message : String(e)
    throw new Error(
      `Failed to fetch ${url}. This is usually CORS (API must allow origin + Authorization header) or a bad VITE_API_BASE_URL. Original error: ${msg}`,
    )
  }

  const durationMs = nowMs() - startedAt
  if (env.sentryDsn && env.sentryEnableMetrics) {
    metrics.count('http.client.request', 1, {
      attributes: { method, pathname, status: res.status, outcome: res.ok ? 'ok' : 'error' },
    })
    metrics.distribution('http.client.duration', durationMs, {
      unit: 'millisecond',
      attributes: { method, pathname, status: res.status },
    })
  }

  if (!res.ok) {
    const text = await res.text().catch(() => undefined)
    const trimmed = text?.trim()
    const details = trimmed ? `\n${trimmed.length > 800 ? `${trimmed.slice(0, 800)}…` : trimmed}` : ''
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired({ source: 'http', status: res.status as 401 | 403, url })
    }
    if (env.sentryDsn && env.sentryEnableLogs && res.status >= 500) {
      logger.error('HTTP request failed', { method, pathname, status: res.status })
    }
    throw new HttpError(`HTTP ${res.status} for ${url}${details}`, res.status, text)
  }

  // Some endpoints (e.g. 204) might return empty body.
  const text = await res.text()
  if (text.length === 0) return undefined as T
  return JSON.parse(text) as T
}
