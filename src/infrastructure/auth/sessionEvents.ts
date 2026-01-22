export type SessionExpiredEvent =
  | {
      source: 'http'
      status: 401 | 403
      url: string
    }
  | {
      source: 'timer'
      expiresAtEpochSeconds: number
    }

type Listener = (event: SessionExpiredEvent) => void

const listeners = new Set<Listener>()

export const onSessionExpired = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const notifySessionExpired = (event: SessionExpiredEvent): void => {
  for (const listener of listeners) listener(event)
}

