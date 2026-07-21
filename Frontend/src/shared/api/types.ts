export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export type ApiErrorCategory = 'user' | 'system'

export interface ApiErrorResponse {
  success: false
  statusCode: number
  code: string
  message: string
  category: ApiErrorCategory
  hint?: string
  errors: string[]
  retryAfterSeconds?: number
}

export type EntityChangeAction = 'create' | 'update' | 'delete'

export type RealtimeEntity =
  | 'users'
  | 'app-roles'
  | 'structural-units'
  | 'objects'
  | 'ppr-types'
  | 'applications'
  | 'application-workflow'
  | 'ppr-calendar'

export interface EntityChangeEvent {
  entity: RealtimeEntity
  action: EntityChangeAction
  data?: unknown
}

export interface UserStatusChangedEvent {
  userId: string
  isOnline: boolean
  lastSeenAt?: string | null
}
