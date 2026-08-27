import { DownloadOutlined } from '@ant-design/icons'
import { Avatar, Drawer, Empty, Image, List, Tabs, Typography, theme } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatConversation, ChatMediaItem } from '@/entities/chat/model/types'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import {
  formatChatBytes,
  formatVoiceDuration,
  getChatAttachmentUrl,
} from '@/features/chat/lib/chat-attachments'
import { fetchChatMedia } from '@/shared/api/chat-api'
import { getStoredFileUrl } from '@/shared/api/files-api'

interface ChatProfileDrawerProps {
  open: boolean
  conversation: ChatConversation | null
  onClose: () => void
}

export function ChatProfileDrawer({ open, conversation, onClose }: ChatProfileDrawerProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [media, setMedia] = useState<ChatMediaItem[]>([])
  const [tab, setTab] = useState('image')
  const peer = conversation?.peer

  useEffect(() => {
    if (!open || !conversation) {
      return
    }

    void fetchChatMedia(conversation.id, 'all').then(setMedia)
  }, [open, conversation])

  const filtered = media.filter((item) => (tab === 'all' ? true : item.kind === tab))

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={380}
      title={t('chat.profile')}
      styles={{ body: { paddingTop: 12 } }}
    >
      {peer ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar size={88} src={peer.avatar ? getStoredFileUrl(peer.avatar) : undefined}>
              {getUserInitials(peer)}
            </Avatar>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {getUserFullName(peer)}
            </Typography.Title>
            <Typography.Text type="secondary">{peer.position}</Typography.Text>
            <Typography.Text style={{ color: peer.isOnline ? token.colorSuccess : token.colorTextSecondary }}>
              {peer.isOnline ? t('chat.online') : t('chat.offline')}
            </Typography.Text>
          </div>

          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: 'image', label: t('chat.images') },
              { key: 'video', label: t('chat.videos') },
              { key: 'file', label: t('chat.files') },
              { key: 'voice', label: t('chat.voice') },
            ]}
          />

          {filtered.length === 0 ? (
            <Empty description={t('chat.noMedia')} />
          ) : (
            <List
              dataSource={filtered}
              renderItem={(item) => {
                if (item.kind === 'image') {
                  return (
                    <List.Item>
                      <Image src={getChatAttachmentUrl(item)} alt={item.name} width="100%" style={{ borderRadius: 8 }} />
                    </List.Item>
                  )
                }

                if (item.kind === 'video') {
                  return (
                    <List.Item>
                      <video controls src={getChatAttachmentUrl(item)} style={{ width: '100%', borderRadius: 8 }} />
                    </List.Item>
                  )
                }

                if (item.kind === 'voice') {
                  return (
                    <List.Item
                      actions={[
                        <a key="dl" href={getChatAttachmentUrl(item)} download={item.name}>
                          <DownloadOutlined />
                        </a>,
                      ]}
                    >
                      <List.Item.Meta
                        title={t('chat.voiceMessage')}
                        description={
                          <div>
                            <audio controls src={getChatAttachmentUrl(item)} style={{ width: '100%' }} />
                            <div>{formatVoiceDuration(item.durationSec)}</div>
                          </div>
                        }
                      />
                    </List.Item>
                  )
                }

                return (
                  <List.Item
                    actions={[
                      <a key="dl" href={getChatAttachmentUrl(item)} download={item.name}>
                        <DownloadOutlined /> {t('chat.download')}
                      </a>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.name}
                      description={formatChatBytes(item.size)}
                    />
                  </List.Item>
                )
              }}
            />
          )}
        </div>
      ) : null}
    </Drawer>
  )
}
