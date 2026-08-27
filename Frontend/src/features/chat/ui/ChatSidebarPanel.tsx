import {
  ArrowLeftOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Empty, Input, List, Tabs, theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/entities/chat/model/chat-store'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { previewMessageText } from '@/features/chat/lib/chat-attachments'
import { filterUsers } from '@/features/users/lib/filter-users'
import { getStoredFileUrl } from '@/shared/api/files-api'

interface ChatSidebarPanelProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function ChatSidebarPanel({ collapsed = false, onNavigate }: ChatSidebarPanelProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.currentUser)
  const users = useUsersStore((state) => state.users)
  const hydrateUsers = useUsersStore((state) => state.hydrate)
  const conversations = useChatStore((state) => state.conversations)
  const isHydrated = useChatStore((state) => state.isHydrated)
  const hydrateChat = useChatStore((state) => state.hydrate)
  const openConversationWithUser = useChatStore((state) => state.openConversationWithUser)
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('chats')

  useEffect(() => {
    void hydrateChat()
    void hydrateUsers()
  }, [hydrateChat, hydrateUsers])

  useEffect(() => {
    if (isHydrated && conversations.length === 0 && tab !== 'users') {
      setTab('users')
    }
  }, [isHydrated, conversations.length, tab])

  const filteredUsers = useMemo(() => {
    return filterUsers(
      users.filter((user) => user.isActive && user.id !== currentUser?.id),
      search,
    )
  }, [users, search, currentUser?.id])

  const filteredConversations = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    if (!normalized) {
      return conversations
    }

    return conversations.filter((item) => {
      if (!item.peer) {
        return false
      }

      const name = getUserFullName(item.peer).toLowerCase()
      return name.includes(normalized) || (item.lastMessage?.content ?? '').toLowerCase().includes(normalized)
    })
  }, [conversations, search])

  const openConversation = async (peerUserId: string) => {
    const conversation = await openConversationWithUser(peerUserId)
    navigate(`/chat/${conversation.id}`)
    onNavigate?.()
  }

  const openExisting = (conversationId: string) => {
    navigate(`/chat/${conversationId}`)
    onNavigate?.()
  }

  if (collapsed) {
    return (
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <ArrowLeftOutlined
          style={{ fontSize: 18, cursor: 'pointer', color: token.colorPrimary }}
          onClick={() => navigate('/')}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          fontWeight: 700,
          color: token.colorPrimary,
        }}
      >
        <ArrowLeftOutlined style={{ cursor: 'pointer' }} onClick={() => navigate('/')} />
        <span>{t('chat.title')}</span>
      </div>

      <div style={{ padding: 12 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('chat.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        centered
        size="small"
        items={[
          { key: 'chats', label: t('chat.conversations') },
          { key: 'users', label: t('chat.users') },
        ]}
        style={{ padding: '0 8px' }}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'chats' ? (
          filteredConversations.length === 0 ? (
            <Empty description={t('chat.emptyConversations')} style={{ marginTop: 40 }} />
          ) : (
            <List
              dataSource={filteredConversations}
              renderItem={(item) => {
                const peer = item.peer
                if (!peer) {
                  return null
                }

                const selected = item.id === activeConversationId

                return (
                  <List.Item
                    onClick={() => openExisting(item.id)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: selected ? token.colorPrimaryBg : undefined,
                      borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge dot={peer.isOnline} offset={[-2, 30]} color="#52c41a">
                          <Avatar src={peer.avatar ? getStoredFileUrl(peer.avatar) : undefined}>
                            {getUserInitials(peer)}
                          </Avatar>
                        </Badge>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{getUserFullName(peer)}</span>
                          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                            {item.lastMessage
                              ? dayjs(item.lastMessage.createdAt).format('HH:mm')
                              : ''}
                          </span>
                        </div>
                      }
                      description={
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 160,
                            }}
                          >
                            {item.lastMessage
                              ? previewMessageText(
                                  item.lastMessage.content,
                                  item.lastMessage.attachments,
                                  {
                                    voiceMessage: t('chat.voiceMessage'),
                                    photo: t('chat.photo'),
                                    video: t('chat.video'),
                                    file: t('chat.file'),
                                    deleted: t('chat.deleted'),
                                  },
                                  Boolean(item.lastMessage.deletedAt),
                                )
                              : peer.position}
                          </span>
                          {item.unreadCount > 0 ? (
                            <Badge count={item.unreadCount} size="small" />
                          ) : null}
                        </div>
                      }
                    />
                  </List.Item>
                )
              }}
            />
          )
        ) : filteredUsers.length === 0 ? (
          <Empty description={t('users.emptySearch')} style={{ marginTop: 40 }} />
        ) : (
          <List
            dataSource={filteredUsers}
            renderItem={(user) => (
              <List.Item
                onClick={() => void openConversation(user.id)}
                style={{
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge dot={user.isOnline} offset={[-2, 30]} color="#52c41a">
                      <Avatar src={user.avatar ? getStoredFileUrl(user.avatar) : undefined}>
                        {getUserInitials(user)}
                      </Avatar>
                    </Badge>
                  }
                  title={getUserFullName(user)}
                  description={user.position}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}
