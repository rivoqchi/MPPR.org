import type { CreateErrorLogPayload } from '@/entities/error-log/model/types'
import { getAccessToken } from '@/shared/lib/token-storage'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
const REPORT_DEDUPE_MS = 30_000
const recentReports = new Map<string, number>()

function shouldSkipReport(key: string): boolean {
  const now = Date.now()
  const previous = recentReports.get(key)

  if (previous && now - previous < REPORT_DEDUPE_MS) {
    return true
  }

  recentReports.set(key, now)
  return false
}

function getCurrentRoute(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  return `${window.location.pathname}${window.location.search}`
}

export async function reportClientError(
  payload: Omit<CreateErrorLogPayload, 'route' | 'userAgent'> & { route?: string },
): Promise<void> {
  const token = getAccessToken()

  if (!token) {
    return
  }

  const route = payload.route ?? getCurrentRoute()
  const dedupeKey = `${payload.source}:${payload.code ?? ''}:${route}:${payload.message}`
  const requestUrl = `${API_BASE_URL}/error-logs`

  if (shouldSkipReport(dedupeKey) || route.startsWith('/login')) {
    return
  }

  try {
    await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Client-Route': route,
      },
      body: JSON.stringify({
        ...payload,
        route,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    })
  } catch {
    // Client error reporting is best-effort.
  }
}

export function getClientRouteHeaderValue(): string {
  return getCurrentRoute()
}
