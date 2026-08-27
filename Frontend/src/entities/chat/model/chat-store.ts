import { create } from 'zustand'
import {
  clearChatConversation,
  deleteChatMessage,
  editChatMessage,
  fetchChatConversations,
  fetchChatMessages,
  getOrCreateChatConversation,
  markChatRead,
  sendChatMessage,
} from '@/shared/api/chat-api'
import type { ChatAttachment, ChatConversation, ChatMessage } from '@/entities/chat/model/types'

export const EMPTY_CHAT_MESSAGES: ChatMessage[] = []
const EMPTY_CONVERSATIONS: ChatConversation[] = []

interface ChatState {
  conversations: ChatConversation[]
  messagesByConversation: Record<string, ChatMessage[]>
  typingByConversation: Record<string, string | null>
  peerLastReadAt: Record<string, string | null>
  activeConversationId: string | null
  isHydrated: boolean
  isLoadingMessages: boolean
  hydrate: () => Promise<void>
  setActiveConversationId: (id: string | null) => void
  openConversationWithUser: (peerUserId: string) => Promise<ChatConversation>
  loadMessages: (conversationId: string, date?: string) => Promise<void>
  sendMessage: (
    conversationId: string,
    data: { content?: string; attachments?: ChatAttachment[]; replyToId?: string },
  ) => Promise<ChatMessage>
  editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>
  removeMessage: (
    conversationId: string,
    messageId: string,
    scope: 'me' | 'everyone',
  ) => Promise<void>
  markRead: (conversationId: string) => Promise<void>
  clearConversation: (conversationId: string) => Promise<void>
  upsertIncomingMessage: (conversationId: string, message: ChatMessage) => void
  applyMessageUpdate: (conversationId: string, message: ChatMessage) => void
  applyMessageDeleted: (
    conversationId: string,
    messageId: string,
    scope: 'me' | 'everyone',
    deletedAt?: string | null,
  ) => void
  setTyping: (conversationId: string, userId: string | null) => void
  applyPeerRead: (conversationId: string, lastReadAt: string) => void
  refreshConversations: () => Promise<void>
}

function sortConversations(items: ChatConversation[]): ChatConversation[] {
  if (items.length === 0) {
    return EMPTY_CONVERSATIONS
  }

  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

function getConversationMessages(state: ChatState, conversationId: string): ChatMessage[] {
  return state.messagesByConversation[conversationId] ?? EMPTY_CHAT_MESSAGES
}

export function selectConversationMessages(conversationId: string) {
  return (state: ChatState) => getConversationMessages(state, conversationId)
}

export function selectConversation(conversationId: string) {
  return (state: ChatState) => state.conversations.find((item) => item.id === conversationId)
}

function applyReadReceipts(messages: ChatMessage[], peerLastReadAt: string | null): ChatMessage[] {
  if (!peerLastReadAt) {
    return messages
  }

  const readAt = new Date(peerLastReadAt).getTime()

  return messages.map((message) => ({
    ...message,
    isReadByPeer: new Date(message.createdAt).getTime() <= readAt,
  }))
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: EMPTY_CONVERSATIONS,
  messagesByConversation: {},
  typingByConversation: {},
  peerLastReadAt: {},
  activeConversationId: null,
  isHydrated: false,
  isLoadingMessages: false,

  hydrate: async () => {
    if (get().isHydrated) {
      return
    }

    const conversations = await fetchChatConversations()
    set({ conversations: sortConversations(conversations), isHydrated: true })
  },

  refreshConversations: async () => {
    const conversations = await fetchChatConversations()
    set({ conversations: sortConversations(conversations), isHydrated: true })
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id })
  },

  openConversationWithUser: async (peerUserId) => {
    const conversation = await getOrCreateChatConversation(peerUserId)
    const existing = get().conversations.find((item) => item.id === conversation.id)
    const next = existing
      ? get().conversations.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
      : sortConversations([conversation, ...get().conversations])

    set({ conversations: next, activeConversationId: conversation.id })
    return conversation
  },

  loadMessages: async (conversationId, date) => {
    set({ isLoadingMessages: true })
    try {
      const messages = await fetchChatMessages(conversationId, { date, limit: 100 })
      const peerLastReadAt = get().peerLastReadAt[conversationId] ?? null
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: applyReadReceipts(messages, peerLastReadAt),
        },
      }))
    } finally {
      set({ isLoadingMessages: false })
    }
  },

  sendMessage: async (conversationId, data) => {
    const message = await sendChatMessage(conversationId, data)
    set((state) => {
      const current = getConversationMessages(state, conversationId)
      const withoutDup = current.filter((item) => item.id !== message.id)
      const conversations = sortConversations(
        state.conversations.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                lastMessage: message,
                updatedAt: message.createdAt,
                unreadCount: 0,
              }
            : item,
        ),
      )

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...withoutDup, message],
        },
        conversations,
      }
    })
    return message
  },

  editMessage: async (conversationId, messageId, content) => {
    const message = await editChatMessage(conversationId, messageId, content)
    get().applyMessageUpdate(conversationId, message)
  },

  removeMessage: async (conversationId, messageId, scope) => {
    await deleteChatMessage(conversationId, messageId, scope)
    get().applyMessageDeleted(conversationId, messageId, scope, new Date().toISOString())
  },

  markRead: async (conversationId) => {
    await markChatRead(conversationId)
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0, lastReadAt: new Date().toISOString() } : item,
      ),
    }))
  },

  clearConversation: async (conversationId) => {
    const result = await clearChatConversation(conversationId)
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [],
      },
      conversations: state.conversations.map((item) =>
        item.id === conversationId
          ? { ...item, clearedAt: result.clearedAt, lastMessage: null, unreadCount: 0 }
          : item,
      ),
    }))
  },

  upsertIncomingMessage: (conversationId, message) => {
    set((state) => {
      const hasConversation = state.conversations.some((item) => item.id === conversationId)
      const current = getConversationMessages(state, conversationId)
      const exists = current.some((item) => item.id === message.id)
      const messages = exists
        ? current.map((item) => (item.id === message.id ? message : item))
        : [...current, message]
      const isActive = state.activeConversationId === conversationId

      if (!hasConversation) {
        void get().refreshConversations()
      }

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
        },
        conversations: sortConversations(
          state.conversations.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  lastMessage: message,
                  updatedAt: message.createdAt,
                  unreadCount: isActive ? 0 : item.unreadCount + (exists ? 0 : 1),
                }
              : item,
          ),
        ),
      }
    })
  },

  applyMessageUpdate: (conversationId, message) => {
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: getConversationMessages(state, conversationId).map((item) =>
          item.id === message.id ? message : item,
        ),
      },
      conversations: state.conversations.map((item) =>
        item.id === conversationId && item.lastMessage?.id === message.id
          ? { ...item, lastMessage: message }
          : item,
      ),
    }))
  },

  applyMessageDeleted: (conversationId, messageId, scope, deletedAt) => {
    set((state) => {
      const current = getConversationMessages(state, conversationId)
      const nextMessages =
        scope === 'me'
          ? current.filter((item) => item.id !== messageId)
          : current.map((item) =>
              item.id === messageId
                ? {
                    ...item,
                    content: '',
                    attachments: [],
                    deletedAt: deletedAt ?? new Date().toISOString(),
                  }
                : item,
            )

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: nextMessages,
        },
      }
    })
  },

  setTyping: (conversationId, userId) => {
    set((state) => ({
      typingByConversation: {
        ...state.typingByConversation,
        [conversationId]: userId,
      },
    }))
  },

  applyPeerRead: (conversationId, lastReadAt) => {
    set((state) => ({
      peerLastReadAt: {
        ...state.peerLastReadAt,
        [conversationId]: lastReadAt,
      },
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: applyReadReceipts(
          getConversationMessages(state, conversationId),
          lastReadAt,
        ),
      },
    }))
  },
}))
