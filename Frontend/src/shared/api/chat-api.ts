import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  ChatAttachment,
  ChatConversation,
  ChatMediaItem,
  ChatMessage,
} from '@/entities/chat/model/types'

export async function fetchChatConversations(): Promise<ChatConversation[]> {
  const response = await api.get('/chat/conversations')
  return unwrapApiResponse<ChatConversation[]>(response)
}

export async function getOrCreateChatConversation(peerUserId: string): Promise<ChatConversation> {
  const response = await api.post('/chat/conversations', { peerUserId })
  return unwrapApiResponse<ChatConversation>(response)
}

export async function fetchChatMessages(
  conversationId: string,
  params?: { before?: string; after?: string; date?: string; limit?: number },
): Promise<ChatMessage[]> {
  const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params })
  return unwrapApiResponse<ChatMessage[]>(response)
}

export async function sendChatMessage(
  conversationId: string,
  data: {
    content?: string
    attachments?: ChatAttachment[]
    replyToId?: string
  },
): Promise<ChatMessage> {
  const response = await api.post(`/chat/conversations/${conversationId}/messages`, data)
  return unwrapApiResponse<ChatMessage>(response)
}

export async function editChatMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<ChatMessage> {
  const response = await api.patch(`/chat/conversations/${conversationId}/messages/${messageId}`, {
    content,
  })
  return unwrapApiResponse<ChatMessage>(response)
}

export async function deleteChatMessage(
  conversationId: string,
  messageId: string,
  scope: 'me' | 'everyone' = 'everyone',
): Promise<void> {
  await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`, {
    data: { scope },
  })
}

export async function markChatRead(conversationId: string): Promise<{ lastReadAt: string }> {
  const response = await api.post(`/chat/conversations/${conversationId}/read`)
  return unwrapApiResponse<{ lastReadAt: string }>(response)
}

export async function clearChatConversation(conversationId: string): Promise<{ clearedAt: string }> {
  const response = await api.post(`/chat/conversations/${conversationId}/clear`)
  return unwrapApiResponse<{ clearedAt: string }>(response)
}

export async function pingChatPeer(conversationId: string): Promise<void> {
  await api.post(`/chat/conversations/${conversationId}/ping`)
}

export async function fetchChatMedia(
  conversationId: string,
  type: 'image' | 'video' | 'file' | 'voice' | 'all' = 'all',
): Promise<ChatMediaItem[]> {
  const response = await api.get(`/chat/conversations/${conversationId}/media`, {
    params: { type },
  })
  return unwrapApiResponse<ChatMediaItem[]>(response)
}
