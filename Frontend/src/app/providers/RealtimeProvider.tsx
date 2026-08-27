import { App } from 'antd'
import { useEffect } from 'react'
import { socketService } from '@/shared/lib/socket'
import { getAccessToken } from '@/shared/lib/token-storage'
import type { EntityChangeEvent, UserStatusChangedEvent } from '@/shared/api/types'
import { syncEntity } from '@/shared/lib/realtime/sync-app-data'
import { handleWorkflowRealtimeEvent } from '@/shared/lib/realtime/workflow-realtime'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { useChatStore } from '@/entities/chat/model/chat-store'
import type { ChatMessage } from '@/entities/chat/model/types'
import { handleIncomingNotification } from '@/entities/notification/lib/handle-incoming-notification'
import { registerInAppNotificationApi } from '@/entities/notification/lib/in-app-notifications'
import type { Notification } from '@/entities/notification/model/types'
import { usePprCalendarStore } from '@/entities/ppr-calendar/model/ppr-calendar-store'
import type { PprCalendarMonth } from '@/entities/ppr-calendar/model/types'

export function RealtimeProvider() {
  const { notification } = App.useApp()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  useEffect(() => {
    registerInAppNotificationApi(notification)

    return () => {
      registerInAppNotificationApi(null)
    }
  }, [notification])

  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect()
      return
    }

    const token = getAccessToken()

    if (!token) {
      return
    }

    const socket = socketService.connect(token)

    const handleEntityChange = (event: EntityChangeEvent) => {
      if (event.entity === 'application-workflow') {
        handleWorkflowRealtimeEvent(event)
        return
      }

      if (event.entity === 'ppr-calendar' && event.data) {
        usePprCalendarStore.getState().upsertMonth(event.data as PprCalendarMonth)
        return
      }

      void syncEntity(event.entity)
    }

    const handleNotificationCreated = (notificationPayload: Notification) => {
      void handleIncomingNotification(notificationPayload)
    }

    const handleUserStatusChanged = (event: UserStatusChangedEvent) => {
      useUsersStore.getState().setUserPresence(event.userId, event.isOnline, event.lastSeenAt)
    }

    const handleChatMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      useChatStore.getState().upsertIncomingMessage(payload.conversationId, payload.message)

      if (useChatStore.getState().activeConversationId === payload.conversationId) {
        void useChatStore.getState().markRead(payload.conversationId)
        socket.emit('chat:read', { conversationId: payload.conversationId })
      } else {
        void useChatStore.getState().refreshConversations()
      }
    }

    const handleChatMessageUpdated = (payload: {
      conversationId: string
      message: ChatMessage
    }) => {
      useChatStore.getState().applyMessageUpdate(payload.conversationId, payload.message)
    }

    const handleChatMessageDeleted = (payload: {
      conversationId: string
      messageId: string
      scope: 'me' | 'everyone'
      deletedAt?: string | null
    }) => {
      useChatStore
        .getState()
        .applyMessageDeleted(
          payload.conversationId,
          payload.messageId,
          payload.scope,
          payload.deletedAt,
        )
    }

    const handleChatTyping = (payload: {
      conversationId: string
      userId: string
      isTyping: boolean
    }) => {
      useChatStore
        .getState()
        .setTyping(payload.conversationId, payload.isTyping ? payload.userId : null)
    }

    const handleChatRead = (payload: {
      conversationId: string
      userId: string
      lastReadAt: string
    }) => {
      useChatStore.getState().applyPeerRead(payload.conversationId, payload.lastReadAt)
    }

    const handleChatConversationUpdated = () => {
      void useChatStore.getState().refreshConversations()
    }

    socket.on('entity:change', handleEntityChange)
    socket.on('notification:created', handleNotificationCreated)
    socket.on('user:status_changed', handleUserStatusChanged)
    socket.on('chat:message', handleChatMessage)
    socket.on('chat:message_updated', handleChatMessageUpdated)
    socket.on('chat:message_deleted', handleChatMessageDeleted)
    socket.on('chat:typing', handleChatTyping)
    socket.on('chat:read', handleChatRead)
    socket.on('chat:conversation_updated', handleChatConversationUpdated)

    return () => {
      socket.off('entity:change', handleEntityChange)
      socket.off('notification:created', handleNotificationCreated)
      socket.off('user:status_changed', handleUserStatusChanged)
      socket.off('chat:message', handleChatMessage)
      socket.off('chat:message_updated', handleChatMessageUpdated)
      socket.off('chat:message_deleted', handleChatMessageDeleted)
      socket.off('chat:typing', handleChatTyping)
      socket.off('chat:read', handleChatRead)
      socket.off('chat:conversation_updated', handleChatConversationUpdated)
    }
  }, [isAuthenticated])

  return null
}
