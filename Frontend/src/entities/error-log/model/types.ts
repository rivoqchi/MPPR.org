export type ErrorLogSource = 'api' | 'frontend' | 'route'

export type ErrorLogSeverity = 'user' | 'system'

export interface ErrorLogUserSummary {
  id: string
  firstName: string
  lastName: string
  phone: string
  position: string
  roleId: string
  appRole?: {
    id: string
    name: string
  } | null
}

export interface ErrorLog {
  id: string
  source: ErrorLogSource
  severity: ErrorLogSeverity
  code?: string | null
  message: string
  hint?: string | null
  route?: string | null
  apiPath?: string | null
  method?: string | null
  statusCode?: number | null
  stack?: string | null
  userId?: string | null
  userFullName?: string | null
  userPhone?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
  resolved: boolean
  createdAt: string
  user?: ErrorLogUserSummary | null
}

export interface ErrorLogsListResponse {
  items: ErrorLog[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateErrorLogPayload {
  source: ErrorLogSource
  severity?: ErrorLogSeverity
  code?: string
  message: string
  hint?: string
  route?: string
  apiPath?: string
  method?: string
  statusCode?: number
  stack?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}
