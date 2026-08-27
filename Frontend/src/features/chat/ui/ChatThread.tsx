import {
  ArrowLeftOutlined,
  ClearOutlined,
  MoreOutlined,
  NotificationOutlined,
} from '@ant-design/icons'
import { App, Avatar, Button, DatePicker, Dropdown, Empty, Spin, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useChatStore, selectConversation, selectConversationMessages } from '@/entities/chat/model/chat-store'
import type { ChatMessage } from '@/entities/chat/model/types'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { ChatProfileDrawer } from '@/features/chat/ui/ChatProfileDrawer'
import { MessageBubble } from '@/features/chat/ui/MessageBubble'
import { MessageComposer } from '@/features/chat/ui/MessageComposer'
import { pingChatPeer } from '@/shared/api/chat-api'
import { getStoredFileUrl } from '@/shared/api/files-api'
import { socketService } from '@/shared/lib/socket'
import { useLayoutBreakpoint } from '@/shared/hooks/useLayoutBreakpoint'

interface ChatThreadProps {
  conversationId: string
}

export function ChatThread({ conversationId }: ChatThreadProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { notification, modal } = App.useApp()
  const navigate = useNavigate()
  const { isMobileOrTablet } = useLayoutBreakpoint()
  const currentUser = useAuthStore((state) => state.currentUser)
  const users = useUsersStore((state) => state.users)
  const conversation = useChatStore(selectConversation(conversationId))
  const messages = useChatStore(selectConversationMessages(conversationId))
  const typingUserId = useChatStore((state) => state.typingByConversation[conversationId] ?? null)
  const loadMessages = useChatStore((state) => state.loadMessages)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const editMessage = useChatStore((state) => state.editMessage)
  const removeMessage = useChatStore((state) => state.removeMessage)
  const markRead = useChatStore((state) => state.markRead)
  const clearConversation = useChatStore((state) => state.clearConversation)
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages)
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId)

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  const peer = conversation?.peer
  const livePeer = peer ? users.find((user) => user.id === peer.id) ?? peer : null

  useEffect(() => {
    setActiveConversationId(conversationId)
    void loadMessages(conversationId, dateFilter)
    void markRead(conversationId)
    socketService.instance?.emit('chat:read', { conversationId })

    return () => {
      setActiveConversationId(null)
    }
  }, [conversationId, dateFilter, loadMessages, markRead, setActiveConversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typingUserId])

  const statusText = useMemo(() => {
    if (!livePeer) {
      return ''
    }

    if (typingUserId && typingUserId === livePeer.id) {
      return t('chat.typing')
    }

    if (livePeer.isOnline) {
      return t('chat.online')
    }

    if (livePeer.lastSeenAt) {
      return t('chat.lastSeen', { time: dayjs(livePeer.lastSeenAt).format('DD.MM.YYYY HH:mm') })
    }

    return t('chat.offline')
  }, [livePeer, typingUserId, t])

  const handleCopy = async (message: ChatMessage) => {
    const text = message.content || message.attachments[0]?.name || ''

    try {
      await navigator.clipboard.writeText(text)
      notification.success({ message: t('chat.copied') })
    } catch {
      notification.error({ message: t('errors.unexpected') })
    }
  }

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: token.colorBgLayout,
        borderRadius: isMobileOrTablet ? 0 : 12,
        overflow: 'hidden',
        border: isMobileOrTablet ? undefined : `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {isMobileOrTablet && (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/chat')} />
        )}

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={() => setProfileOpen(true)}
        >
          <Avatar src={livePeer?.avatar ? getStoredFileUrl(livePeer.avatar) : undefined}>
            {livePeer ? getUserInitials(livePeer) : '?'}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Typography.Text strong ellipsis>
              {livePeer ? getUserFullName(livePeer) : '…'}
            </Typography.Text>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{statusText}</div>
          </div>
        </div>

        <DatePicker
          allowClear
          placeholder={t('chat.filterByDate')}
          value={dateFilter ? dayjs(dateFilter) : null}
          onChange={(value) => setDateFilter(value ? value.format('YYYY-MM-DD') : undefined)}
          style={{ maxWidth: isMobileOrTablet ? 120 : 160 }}
        />

        <Dropdown
          menu={{
            items: [
              {
                key: 'ping',
                icon: <NotificationOutlined />,
                label: t('chat.ping'),
                onClick: () => {
                  void pingChatPeer(conversationId).then(() => {
                    notification.success({ message: t('chat.pingSent') })
                  })
                },
              },
              {
                key: 'clear',
                icon: <ClearOutlined />,
                danger: true,
                label: t('chat.clearChat'),
                onClick: () => {
                  modal.confirm({
                    title: t('chat.clearChat'),
                    content: t('chat.clearConfirm'),
                    onOk: () => clearConversation(conversationId),
                  })
                },
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 0' }}>
        {isLoadingMessages ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <Spin />
          </div>
        ) : messages.length === 0 ? (
          <Empty description={t('chat.emptyMessages')} style={{ marginTop: 80 }} />
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUser?.id}
              onReply={setReplyTo}
              onEdit={(item) => {
                setEditing(item)
                setReplyTo(null)
              }}
              onCopy={(item) => void handleCopy(item)}
              onDelete={(item, scope) => void removeMessage(conversationId, item.id, scope)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        replyTo={replyTo}
        editing={editing}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSend={async (data) => {
          await sendMessage(conversationId, data)
          socketService.instance?.emit('chat:read', { conversationId })
        }}
        onEditSave={async (content) => {
          if (!editing) {
            return
          }

          await editMessage(conversationId, editing.id, content)
        }}
        onTyping={(isTyping) => {
          socketService.instance?.emit('chat:typing', { conversationId, isTyping })
        }}
      />

      <ChatProfileDrawer
        open={profileOpen}
        conversation={conversation}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  )
}
