import { showBrowserNotification } from '@/entities/notification/lib/browser-notifications'
import { showInAppNotification } from '@/entities/notification/lib/in-app-notifications'
import { useNotificationsStore } from '@/entities/notification/model/notifications-store'
import type { Notification } from '@/entities/notification/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { useChatStore } from '@/entities/chat/model/chat-store'
import { markNotificationAsRead } from '@/shared/api/notifications-api'
import { syncEntity } from '@/shared/lib/realtime/sync-app-data'
import { useUiStore } from '@/shared/stores/ui-store'

const APPLICATION_NOTIFICATION_TYPES = new Set([
  'application_created',
  'application_workflow_message',
  'application_workflow_status',
])

const CHAT_NOTIFICATION_TYPES = new Set(['chat_message', 'chat_ping'])

function getActiveChatConversationId(): string | null {
  const activeConversationId = useChatStore.getState().activeConversationId
  if (activeConversationId) {
    return activeConversationId
  }

  const match = window.location.pathname.match(/^\/chat\/([^/]+)$/)
  return match?.[1] ?? null
}

function getNotificationConversationId(notification: Notification): string | null {
  const metadataConversationId = notification.metadata?.conversationId
  if (typeof metadataConversationId === 'string' && metadataConversationId.length > 0) {
    return metadataConversationId
  }

  const linkPath = notification.linkPath
  if (!linkPath) {
    return null
  }

  const match = linkPath.match(/^\/chat\/([^/]+)$/)
  return match?.[1] ?? null
}

function shouldSuppressChatNotificationUi(notification: Notification): boolean {
  if (!CHAT_NOTIFICATION_TYPES.has(notification.type)) {
    return false
  }

  const activeConversationId = getActiveChatConversationId()
  const notificationConversationId = getNotificationConversationId(notification)

  return Boolean(
    activeConversationId &&
      notificationConversationId &&
      activeConversationId === notificationConversationId,
  )
}

function normalizeIncomingNotification(payload: Notification): Notification {
  return {
    ...payload,
    createdAt:
      typeof payload.createdAt === 'string'
        ? payload.createdAt
        : new Date(payload.createdAt as unknown as string | number | Date).toISOString(),
    read: Boolean(payload.read),
    linkPath: payload.linkPath ?? null,
    metadata:
      payload.metadata && typeof payload.metadata === 'object'
        ? (payload.metadata as Record<string, unknown>)
        : null,
  }
}

async function refreshApplicationsIfNeeded(notification: Notification): Promise<void> {
  if (!APPLICATION_NOTIFICATION_TYPES.has(notification.type)) {
    return
  }

  if (useApplicationsStore.getState().isHydrated) {
    await syncEntity('applications')
  }
}

export async function handleIncomingNotification(notification: Notification): Promise<void> {
  const {
    browserNotificationsEnabled,
    inAppRealtimeNotificationsEnabled,
    autoMarkNotificationsAsRead,
  } = useUiStore.getState()

  let nextNotification = normalizeIncomingNotification(notification)

  const suppressChatNotificationUi = shouldSuppressChatNotificationUi(nextNotification)

  if (autoMarkNotificationsAsRead && !nextNotification.read) {
    try {
      nextNotification = normalizeIncomingNotification(
        await markNotificationAsRead(nextNotification.id),
      )
    } catch {
      // Keep the original unread notification if the API call fails.
    }
  } else if (suppressChatNotificationUi && !nextNotification.read) {
    try {
      nextNotification = normalizeIncomingNotification(
        await markNotificationAsRead(nextNotification.id),
      )
    } catch {
      // Keep the original unread notification if the API call fails.
    }
  }

  useNotificationsStore.getState().addNotification(nextNotification)

  if (inAppRealtimeNotificationsEnabled !== false && !suppressChatNotificationUi) {
    showInAppNotification(nextNotification)
  }

  if (browserNotificationsEnabled && !suppressChatNotificationUi) {
    showBrowserNotification(nextNotification)
  }

  void refreshApplicationsIfNeeded(nextNotification)
}
