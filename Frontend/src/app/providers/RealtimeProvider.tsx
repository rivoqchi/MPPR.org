import { useEffect } from 'react'
import { socketService } from '@/shared/lib/socket'
import { getAccessToken } from '@/shared/lib/token-storage'
import type { EntityChangeEvent } from '@/shared/api/types'
import { syncEntity } from '@/shared/lib/realtime/sync-app-data'
import { handleWorkflowRealtimeEvent } from '@/shared/lib/realtime/workflow-realtime'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'
import { handleIncomingNotification } from '@/entities/notification/lib/handle-incoming-notification'
import type { Notification } from '@/entities/notification/model/types'
import { usePprCalendarStore } from '@/entities/ppr-calendar/model/ppr-calendar-store'
import type { PprCalendarMonth } from '@/entities/ppr-calendar/model/types'

export function RealtimeProvider() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

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

    const handleNotificationCreated = (notification: Notification) => {
      void handleIncomingNotification(notification)
    }

    socket.on('entity:change', handleEntityChange)
    socket.on('notification:created', handleNotificationCreated)

    return () => {
      socket.off('entity:change', handleEntityChange)
      socket.off('notification:created', handleNotificationCreated)
    }
  }, [isAuthenticated])

  return null
}
