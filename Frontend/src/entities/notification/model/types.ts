export type NotificationType =
  | 'ppr_calendar_submitted'
  | 'ppr_calendar_approved'
  | 'ppr_calendar_rejected'
  | 'ppr_calendar_entry_moved'
  | 'application_created'
  | 'application_workflow_message'
  | 'application_workflow_status'
  | 'role_permissions_updated'
  | 'user_role_changed'
  | 'user_access_changed'
  | 'system'

export interface Notification {
  id: string
  userId: string
  type: NotificationType | string
  title: string
  message: string
  linkPath?: string | null
  metadata?: Record<string, unknown> | null
  read: boolean
  createdAt: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface NotificationsListResponse {
  items: Notification[]
  meta: PaginationMeta
}
