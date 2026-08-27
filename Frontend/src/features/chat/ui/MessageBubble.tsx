import {
  CheckOutlined,
  DownloadOutlined,
  FileOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { Dropdown, Image, theme, Typography } from 'antd'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '@/entities/chat/model/types'
import {
  formatChatBytes,
  formatVoiceDuration,
  getChatAttachmentUrl,
} from '@/features/chat/lib/chat-attachments'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  onReply: (message: ChatMessage) => void
  onEdit: (message: ChatMessage) => void
  onCopy: (message: ChatMessage) => void
  onDelete: (message: ChatMessage, scope: 'me' | 'everyone') => void
}

export function MessageBubble({
  message,
  isOwn,
  onReply,
  onEdit,
  onCopy,
  onDelete,
}: MessageBubbleProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const deleted = Boolean(message.deletedAt)

  const menuItems: MenuProps['items'] = [
    { key: 'reply', label: t('chat.reply'), onClick: () => onReply(message) },
    { key: 'copy', label: t('chat.copy'), onClick: () => onCopy(message) },
    ...(isOwn && !deleted
      ? [{ key: 'edit', label: t('chat.edit'), onClick: () => onEdit(message) }]
      : []),
    {
      key: 'delete-me',
      label: t('chat.deleteForMe'),
      danger: true,
      onClick: () => onDelete(message, 'me'),
    },
    ...(isOwn && !deleted
      ? [
          {
            key: 'delete-everyone',
            label: t('chat.deleteForEveryone'),
            danger: true,
            onClick: () => onDelete(message, 'everyone'),
          },
        ]
      : []),
  ]

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 8,
        padding: '0 12px',
      }}
    >
      <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
        <div
          style={{
            maxWidth: 'min(72%, 520px)',
            borderRadius: 14,
            padding: '8px 12px',
            background: isOwn ? token.colorPrimary : token.colorBgContainer,
            color: isOwn ? '#fff' : token.colorText,
            boxShadow: token.boxShadowTertiary,
            cursor: 'context-menu',
          }}
        >
          {message.replyTo ? (
            <div
              style={{
                borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.7)' : token.colorPrimary}`,
                paddingLeft: 8,
                marginBottom: 6,
                opacity: 0.9,
                fontSize: 12,
              }}
            >
              {message.replyTo.deletedAt
                ? t('chat.deleted')
                : message.replyTo.content || message.replyTo.attachments[0]?.name || '…'}
            </div>
          ) : null}

          {deleted ? (
            <Typography.Text italic style={{ color: isOwn ? 'rgba(255,255,255,0.85)' : undefined }}>
              {t('chat.deleted')}
            </Typography.Text>
          ) : (
            <>
              {message.attachments.map((attachment) => {
                if (attachment.kind === 'image') {
                  return (
                    <Image
                      key={attachment.id}
                      src={getChatAttachmentUrl(attachment)}
                      alt={attachment.name}
                      style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 6 }}
                    />
                  )
                }

                if (attachment.kind === 'video') {
                  return (
                    <video
                      key={attachment.id}
                      controls
                      src={getChatAttachmentUrl(attachment)}
                      style={{ width: '100%', maxWidth: 360, borderRadius: 8, marginBottom: 6 }}
                    />
                  )
                }

                if (attachment.kind === 'voice') {
                  return (
                    <div
                      key={attachment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                        minWidth: 200,
                      }}
                    >
                      <PlayCircleOutlined />
                      <audio controls src={getChatAttachmentUrl(attachment)} style={{ flex: 1, height: 32 }} />
                      <span style={{ fontSize: 12 }}>{formatVoiceDuration(attachment.durationSec)}</span>
                    </div>
                  )
                }

                return (
                  <a
                    key={attachment.id}
                    href={getChatAttachmentUrl(attachment)}
                    download={attachment.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: isOwn ? '#fff' : token.colorPrimary,
                      marginBottom: 6,
                    }}
                  >
                    <FileOutlined />
                    <span style={{ flex: 1 }}>
                      {attachment.name} ({formatChatBytes(attachment.size)})
                    </span>
                    <DownloadOutlined />
                  </a>
                )
              })}

              {message.content ? (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
              ) : null}
            </>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              fontSize: 11,
              opacity: 0.8,
            }}
          >
            {message.editedAt ? <span>{t('chat.edited')}</span> : null}
            <span>{dayjs(message.createdAt).format('HH:mm')}</span>
            {isOwn ? (
              <span style={{ display: 'inline-flex', gap: 0 }}>
                <CheckOutlined style={{ fontSize: 11 }} />
                {message.isReadByPeer ? <CheckOutlined style={{ fontSize: 11, marginLeft: -4 }} /> : null}
              </span>
            ) : null}
          </div>
        </div>
      </Dropdown>
    </div>
  )
}
