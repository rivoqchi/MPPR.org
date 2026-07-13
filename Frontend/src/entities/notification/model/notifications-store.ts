import { create } from 'zustand'
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/shared/api/notifications-api'
import type { Notification, PaginationMeta } from '@/entities/notification/model/types'

interface NotificationsState {
  items: Notification[]
  unreadCount: number
  meta: PaginationMeta
  isLoading: boolean
  loadNotifications: (page?: number, limit?: number) => Promise<void>
  loadUnreadCount: () => Promise<void>
  addNotification: (notification: Notification) => void
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const defaultMeta: PaginationMeta = {
  page: 1,
  limit: 100,
  total: 0,
  totalPages: 1,
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  meta: defaultMeta,
  isLoading: false,

  loadNotifications: async (page = 1, limit = 100) => {
    set({ isLoading: true })

    try {
      const data = await fetchNotifications({
        page,
        limit,
        unreadOnly: false,
      })

      set({
        items: data.items,
        meta: data.meta,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  loadUnreadCount: async () => {
    const count = await fetchUnreadNotificationsCount()
    set({ unreadCount: count })
  },

  addNotification: (notification) => {
    set((state) => {
      const exists = state.items.some((item) => item.id === notification.id)
      const wasUnread = exists
        ? state.items.find((item) => item.id === notification.id)?.read === false
        : false

      return {
        items: [notification, ...state.items.filter((item) => item.id !== notification.id)].slice(
          0,
          state.meta.limit,
        ),
        unreadCount:
          !notification.read && !wasUnread
            ? state.unreadCount + 1
            : notification.read && wasUnread
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
      }
    })
  },

  markRead: async (id) => {
    const wasUnread = get().items.find((item) => item.id === id)?.read === false
    const notification = await markNotificationAsRead(id)

    set((state) => ({
      items: state.items.map((item) => (item.id === id ? notification : item)),
      unreadCount:
        wasUnread && notification.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
    }))
  },

  markAllRead: async () => {
    await markAllNotificationsAsRead()
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    }))
  },
}))
