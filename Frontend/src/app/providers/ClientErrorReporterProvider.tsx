import { useEffect } from 'react'
import { reportClientError } from '@/shared/lib/error-log-reporter'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'

export function ClientErrorReporterProvider() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const handleWindowError = (event: ErrorEvent) => {
      void reportClientError({
        source: 'frontend',
        severity: 'system',
        code: 'CLIENT_RUNTIME_ERROR',
        message: event.message || 'CLIENT_RUNTIME_ERROR',
        stack: event.error instanceof Error ? event.error.stack : undefined,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'CLIENT_UNHANDLED_REJECTION'

      void reportClientError({
        source: 'frontend',
        severity: 'system',
        code: 'CLIENT_UNHANDLED_REJECTION',
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [isAuthenticated])

  return null
}
