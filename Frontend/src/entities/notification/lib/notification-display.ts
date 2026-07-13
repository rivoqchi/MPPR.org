import type { NotificationType } from '@/entities/notification/model/types'

export function getNotificationTypeColor(type: NotificationType | string): string {
  switch (type) {
    case 'ppr_calendar_submitted':
    case 'ppr_calendar_approved':
    case 'ppr_calendar_rejected':
      return 'blue'
    case 'application_created':
    case 'application_workflow_message':
    case 'application_workflow_status':
      return 'green'
    case 'role_permissions_updated':
    case 'user_role_changed':
    case 'user_access_changed':
      return 'purple'
    default:
      return 'default'
  }
}

export function formatNotificationTime(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return 'Hozir'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} daqiqa oldin`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} soat oldin`
  }

  return date.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
