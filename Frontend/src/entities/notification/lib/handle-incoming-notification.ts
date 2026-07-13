import { showBrowserNotification } from '@/entities/notification/lib/browser-notifications'
import { useNotificationsStore } from '@/entities/notification/model/notifications-store'
import type { Notification } from '@/entities/notification/model/types'
import { markNotificationAsRead } from '@/shared/api/notifications-api'
import { useUiStore } from '@/shared/stores/ui-store'

export async function handleIncomingNotification(notification: Notification): Promise<void> {
  const { browserNotificationsEnabled, autoMarkNotificationsAsRead } = useUiStore.getState()

  let nextNotification = notification

  if (autoMarkNotificationsAsRead && !notification.read) {
    try {
      nextNotification = await markNotificationAsRead(notification.id)
    } catch {
      // Keep the original unread notification if the API call fails.
    }
  }

  useNotificationsStore.getState().addNotification(nextNotification)

  if (browserNotificationsEnabled) {
    showBrowserNotification(nextNotification)
  }
}
