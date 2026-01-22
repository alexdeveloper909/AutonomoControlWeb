import { QueryClient } from '@tanstack/react-query'
import { HttpError } from '../../infrastructure/http/httpError'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 60 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof HttpError && (error.status === 401 || error.status === 403)) return false
        return failureCount < 3
      },
    },
  },
})
