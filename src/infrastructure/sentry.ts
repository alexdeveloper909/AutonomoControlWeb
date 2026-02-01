import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'
import { env } from './config/env'

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const clampSampleRate = (v: number | undefined): number | undefined => {
  if (v == null) return undefined
  if (!Number.isFinite(v)) return undefined
  return Math.min(1, Math.max(0, v))
}

const defaultTracesSampleRate = (): number | undefined => {
  // Keep tracing enabled by default when Sentry is enabled.
  // Tune via VITE_SENTRY_TRACES_SAMPLE_RATE.
  if (!env.sentryDsn) return undefined
  return env.appStage === 'dev' ? 1.0 : 0.2
}

const getTracePropagationTargets = (): Array<string | RegExp> => {
  const targets: Array<string | RegExp> = ['localhost']

  if (env.apiBaseUrl) {
    try {
      const origin = new URL(env.apiBaseUrl).origin
      targets.push(new RegExp(`^${escapeRegExp(origin)}`))
    } catch {
      // ignore invalid URL
    }
  }

  return targets
}

export const initSentry = (): void => {
  if (!env.sentryDsn) return

  const tracesSampleRate = clampSampleRate(env.sentryTracesSampleRate ?? defaultTracesSampleRate())

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment ?? env.appStage,
    release: env.sentryRelease,

    integrations: [
      // React Router route-aware navigation transactions
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),

      // Structured logs (optional) + console forwarding
      ...(env.sentryEnableLogs ? [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })] : []),
    ],

    ...(tracesSampleRate != null ? { tracesSampleRate } : {}),
    tracePropagationTargets: getTracePropagationTargets(),

    // Logs / metrics (both optional, controlled by env vars)
    enableLogs: env.sentryEnableLogs,
    enableMetrics: env.sentryEnableMetrics,

    initialScope: {
      tags: {
        appStage: env.appStage,
      },
    },

    beforeSendLog: (log) => {
      // Guardrail: keep prod log volume reasonable by default.
      if (env.appStage === 'prod' && (log.level === 'debug' || log.level === 'trace')) return null
      return log
    },

    beforeSendMetric: (metric) => {
      // Guardrail: never send unnamed metrics.
      if (!metric.name) return null
      return metric
    },
  })
}

export const captureException = (
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): void => {
  if (!env.sentryDsn) return

  if (error instanceof Error) {
    Sentry.captureException(error, { tags: context?.tags, extra: context?.extra })
    return
  }

  Sentry.captureException(new Error(typeof error === 'string' ? error : 'Non-Error exception'), {
    tags: context?.tags,
    extra: { ...context?.extra, original: error },
  })
}

export const setSentryUser = (user: { id: string; email?: string | null; username?: string | null } | null): void => {
  if (!env.sentryDsn) return

  if (!user) {
    Sentry.setUser(null)
    return
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    username: user.username ?? undefined,
  })
}

export const logger = Sentry.logger
export const metrics = Sentry.metrics

