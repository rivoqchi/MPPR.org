export type ChatAttachmentKind = 'image' | 'video' | 'file' | 'voice'

export type ChatAttachment = {
  id: string
  name: string
  size: number
  mimeType: string
  kind: ChatAttachmentKind
  durationSec?: number
}

export type ChatPeerUser = {
  id: string
  firstName: string
  lastName: string
  phone: string
  position: string
  avatar?: string | null
  isActive: boolean
  isOnline?: boolean
  lastSeenAt?: string | null
}

export type ChatMessageReplyPreview = {
  id: string
  senderId: string
  content: string
  deletedAt: string | null
  attachments: ChatAttachment[]
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachments: ChatAttachment[]
  replyToId: string | null
  replyTo: ChatMessageReplyPreview | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  isReadByPeer: boolean
}

export type ChatConversation = {
  id: string
  updatedAt: string
  clearedAt: string | null
  lastReadAt: string | null
  muted: boolean
  unreadCount: number
  peer: ChatPeerUser | null
  lastMessage: ChatMessage | null
}

export type ChatMediaItem = ChatAttachment & {
  messageId: string
  createdAt: string
}
