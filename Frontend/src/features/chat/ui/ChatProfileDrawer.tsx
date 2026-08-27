import { DownloadOutlined } from '@ant-design/icons'
import { Avatar, Drawer, Empty, Image, List, Tabs, Typography, theme } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatConversation, ChatMediaItem } from '@/entities/chat/model/types'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import {
  formatChatBytes,
  getChatAttachmentUrl,
} from '@/features/chat/lib/chat-attachments'
import { VoiceMessagePlayer } from '@/features/chat/ui/VoiceMessagePlayer'
import { fetchChatMedia } from '@/shared/api/chat-api'
import { getStoredFileUrl } from '@/shared/api/files-api'

interface ChatProfileDrawerProps {
  open: boolean
  conversation: ChatConversation | null
  onClose: () => void
}

function ChatMediaGrid({
  items,
  tab,
  fillColor,
}: {
  items: ChatMediaItem[]
  tab: string
  fillColor: string
}) {
  const grid = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            aspectRatio: '1',
            overflow: 'hidden',
            borderRadius: 10,
            background: fillColor,
          }}
        >
          {item.kind === 'image' ? (
            <Image
              src={getChatAttachmentUrl(item)}
              alt={item.name}
              preview
              width="100%"
              height="100%"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <video
              controls
              src={getChatAttachmentUrl(item)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                background: '#000',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )

  if (tab === 'image') {
    return <Image.PreviewGroup>{grid}</Image.PreviewGroup>
  }

  return grid
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
  const isGridTab = tab === 'image' || tab === 'video'

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
          ) : isGridTab ? (
            <ChatMediaGrid items={filtered} tab={tab} fillColor={token.colorFillQuaternary} />
          ) : (
            <List
              split={tab !== 'voice'}
              dataSource={filtered}
              renderItem={(item) => {
                if (item.kind === 'voice') {
                  return (
                    <List.Item style={{ padding: '6px 0', borderBlockEnd: 'none' }}>
                      <VoiceMessagePlayer
                        variant="media"
                        src={getChatAttachmentUrl(item)}
                        durationSec={item.durationSec}
                        seed={item.id}
                        createdAt={item.createdAt}
                        downloadHref={getChatAttachmentUrl(item)}
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
