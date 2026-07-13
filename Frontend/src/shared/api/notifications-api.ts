import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  Notification,
  NotificationsListResponse,
} from '@/entities/notification/model/types'

export async function fetchNotifications(params: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}): Promise<NotificationsListResponse> {
  const response = await api.get('/notifications', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.unreadOnly ? { unreadOnly: 'true' } : {}),
    },
  })
  return unwrapApiResponse<NotificationsListResponse>(response)
}

export async function fetchUnreadNotificationsCount(): Promise<number> {
  const response = await api.get('/notifications/unread-count')
  const data = unwrapApiResponse<{ count: number }>(response)
  return data.count
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  const response = await api.patch(`/notifications/${id}/read`, { read: true })
  return unwrapApiResponse<Notification>(response)
}

export async function markAllNotificationsAsRead(): Promise<{ updated: number }> {
  const response = await api.patch('/notifications/read-all')
  return unwrapApiResponse<{ updated: number }>(response)
}
