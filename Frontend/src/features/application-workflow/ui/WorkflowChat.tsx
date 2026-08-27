import {
  CloseOutlined,
  DownloadOutlined,
  EyeOutlined,
  PaperClipOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { App, Button, Image, Input, Space, Upload, theme } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicationAttachment, ApplicationWorkflowMessage } from '@/entities/application/model/types'
import { getUserFullName } from '@/entities/user/lib/user-display'
import {
  downloadApplicationAttachment,
  formatAttachmentSize,
  getAttachmentPreviewUrl,
  isImageAttachment,
  isPreviewableAttachment,
  toApplicationAttachments,
} from '@/features/application-submit/lib/attachment-utils'
import { PAGE_CONTENT_PADDING } from '@/shared/lib/page-layout'

interface WorkflowMessageListProps {
  messages: ApplicationWorkflowMessage[]
  currentUserId?: string
}

function MessageAttachments({
  attachments,
  isOwn,
}: {
  attachments: ApplicationAttachment[]
  isOwn: boolean
}) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (attachments.length === 0) {
    return null
  }

  const handlePreview = async (attachment: ApplicationAttachment) => {
    if (!isPreviewableAttachment(attachment)) {
      notification.error({ message: t('applicationSubmit.attachments.previewUnavailable') })
      return
    }

    const url = await getAttachmentPreviewUrl(attachment)

    if (!url) {
      notification.error({ message: t('applicationSubmit.attachments.previewUnavailable') })
      return
    }

    if (isImageAttachment(attachment)) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(url)
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async (attachment: ApplicationAttachment) => {
    const downloaded = await downloadApplicationAttachment(attachment)

    if (!downloaded) {
      notification.error({ message: t('applicationSubmit.attachments.downloadUnavailable') })
    }
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 8,
            background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
            {attachment.name} ({formatAttachmentSize(attachment.size)})
          </span>
          <Space size={4}>
            {isPreviewableAttachment(attachment) && (
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => void handlePreview(attachment)}
              />
            )}
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => void handleDownload(attachment)}
            />
          </Space>
        </div>
      ))}

      {previewUrl && (
        <Image
          style={{ display: 'none' }}
          preview={{
            visible: true,
            src: previewUrl,
            onVisibleChange: (visible) => {
              if (!visible) {
                URL.revokeObjectURL(previewUrl)
                setPreviewUrl(null)
              }
            },
          }}
        />
      )}
    </div>
  )
}

export function WorkflowMessageList({ messages, currentUserId }: WorkflowMessageListProps) {
  const { token } = theme.useToken()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
      {messages.map((message) => {
        const isOwn = message.authorUserId === currentUserId
        const authorName = getUserFullName({
          firstName: message.authorFirstName ?? '',
          lastName: message.authorLastName ?? '',
        })

        return (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: isOwn ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '72%',
                padding: '10px 12px',
                borderRadius: 12,
                background: isOwn ? token.colorPrimary : token.colorFillSecondary,
                color: isOwn ? token.colorTextLightSolid : token.colorText,
              }}
            >
              {!isOwn && (
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, opacity: 0.85 }}>
                  {authorName}
                </div>
              )}
              {message.content && <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>}
              <MessageAttachments attachments={message.attachments} isOwn={isOwn} />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  opacity: 0.75,
                  textAlign: isOwn ? 'right' : 'left',
                }}
              >
                {dayjs(message.createdAt).format('DD.MM.YYYY HH:mm')}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

interface WorkflowChatComposerProps {
  onSend: (content: string, attachments: ApplicationAttachment[]) => Promise<void>
  sending?: boolean
  disabled?: boolean
}

export function WorkflowChatComposer({ onSend, sending = false, disabled = false }: WorkflowChatComposerProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [content, setContent] = useState('')
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleSend = async () => {
    const trimmed = content.trim()

    if (!trimmed && fileList.length === 0) {
      return
    }

    const imageFiles = fileList.filter((file) => file.type?.startsWith('image/'))
    const otherFiles = fileList.filter((file) => !file.type?.startsWith('image/'))
    const attachments = [
      ...(await toApplicationAttachments(imageFiles, [], 'image')),
      ...(await toApplicationAttachments(otherFiles, [], 'file')),
    ]

    await onSend(trimmed, attachments)
    setContent('')
    setFileList([])
  }

  const handleFileListChange = (nextFileList: UploadFile[]) => {
    setFileList(nextFileList)
  }

  const removeFile = (uid: string) => {
    setFileList((current) => current.filter((file) => file.uid !== uid))
  }

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        padding: `${PAGE_CONTENT_PADDING}px ${PAGE_CONTENT_PADDING}px`,
        background: token.colorBgContainer,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
      }}
    >
      {fileList.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '100%',
            minWidth: 0,
          }}
        >
          {fileList.map((file) => (
            <div
              key={file.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
                padding: '6px 10px',
                borderRadius: token.borderRadius,
                background: token.colorFillTertiary,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <PaperClipOutlined style={{ flexShrink: 0, color: token.colorTextSecondary }} />
              <span
                title={file.name}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                }}
              >
                {file.name}
              </span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                disabled={disabled}
                onClick={() => removeFile(file.uid)}
                aria-label={t('common.delete')}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          minWidth: 0,
          width: '100%',
        }}
      >
        <Upload
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          showUploadList={false}
          beforeUpload={() => false}
          fileList={fileList}
          onChange={({ fileList: nextFileList }) => handleFileListChange(nextFileList)}
          disabled={disabled}
        >
          <Button icon={<PaperClipOutlined />} disabled={disabled} />
        </Upload>
        <Input.TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t('applicationWorkflow.messagePlaceholder')}
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={disabled}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          disabled={disabled}
          onClick={() => void handleSend()}
        />
      </div>
    </div>
  )
}
