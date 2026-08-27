import { CloseOutlined, PaperClipOutlined, SendOutlined } from '@ant-design/icons'
import { App, Button, Input, Space, Upload, theme } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatAttachment, ChatMessage } from '@/entities/chat/model/types'
import { toChatAttachment } from '@/features/chat/lib/chat-attachments'
import { VoiceRecorder } from '@/features/chat/ui/VoiceRecorder'
import { uploadFile } from '@/shared/api/files-api'

interface MessageComposerProps {
  disabled?: boolean
  replyTo: ChatMessage | null
  editing: ChatMessage | null
  onCancelReply: () => void
  onCancelEdit: () => void
  onSend: (data: {
    content?: string
    attachments?: ChatAttachment[]
    replyToId?: string
  }) => Promise<void>
  onEditSave: (content: string) => Promise<void>
  onTyping: (isTyping: boolean) => void
}

export function MessageComposer({
  disabled,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onSend,
  onEditSave,
  onTyping,
}: MessageComposerProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { notification } = App.useApp()
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([])
  const [sending, setSending] = useState(false)
  const typingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setText(editing?.content ?? '')
  }, [editing])

  const emitTyping = (isTyping: boolean) => {
    onTyping(isTyping)

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => onTyping(false), 2000)
    }
  }

  const uploadAndQueue = async (file: File | Blob, fileName: string, durationSec?: number) => {
    const meta = await uploadFile(file, fileName)
    return toChatAttachment(meta, undefined, durationSec)
  }

  const showError = () => {
    notification.error({ message: t('errors.unexpected') })
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items

    if (!items) {
      return
    }

    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()

        if (file) {
          event.preventDefault()
          void uploadAndQueue(file, file.name || `paste-${Date.now()}.png`)
            .then((attachment) => setPendingFiles((prev) => [...prev, attachment]))
            .catch(showError)
        }
      }
    }
  }

  const handleSubmit = async (extraAttachments: ChatAttachment[] = []) => {
    const content = text.trim()
    const attachments = [...pendingFiles, ...extraAttachments]

    if (!content && attachments.length === 0) {
      return
    }

    setSending(true)

    try {
      if (editing) {
        await onEditSave(content)
        setText('')
        onCancelEdit()
      } else {
        await onSend({
          content,
          attachments,
          replyToId: replyTo?.id,
        })
        setText('')
        setPendingFiles([])
        onCancelReply()
      }

      emitTyping(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        padding: 12,
        background: token.colorBgContainer,
      }}
    >
      {(replyTo || editing) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            padding: '6px 10px',
            borderRadius: 8,
            background: token.colorFillTertiary,
          }}
        >
          <span style={{ fontSize: 13 }}>
            {editing ? t('chat.edit') : t('chat.reply')}:{' '}
            {(editing ?? replyTo)?.content || (editing ?? replyTo)?.attachments[0]?.name || '…'}
          </span>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => {
              if (editing) {
                onCancelEdit()
                setText('')
              } else {
                onCancelReply()
              }
            }}
          />
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {pendingFiles.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 8,
                background: token.colorFillSecondary,
                fontSize: 12,
              }}
            >
              <span>{file.name}</span>
              <CloseOutlined
                style={{ cursor: 'pointer' }}
                onClick={() => setPendingFiles((prev) => prev.filter((item) => item.id !== file.id))}
              />
            </div>
          ))}
        </div>
      )}

      <Space.Compact style={{ width: '100%' }}>
        {!editing && (
          <Upload
            showUploadList={false}
            multiple
            beforeUpload={(file) => {
              void uploadAndQueue(file as File, file.name)
                .then((attachment) => setPendingFiles((prev) => [...prev, attachment]))
                .catch(showError)
              return false
            }}
          >
            <Button icon={<PaperClipOutlined />} disabled={disabled || sending} title={t('chat.attach')} />
          </Upload>
        )}

        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={text}
          disabled={disabled || sending}
          placeholder={t('chat.typeMessage')}
          onChange={(event) => {
            setText(event.target.value)
            emitTyping(true)
          }}
          onPaste={handlePaste}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          style={{ flex: 1 }}
        />

        {!editing && (
          <VoiceRecorder
            disabled={disabled || sending}
            onRecorded={(blob, durationSec) => {
              const extension = blob.type.includes('ogg') ? 'ogg' : 'webm'
              void uploadAndQueue(blob, `voice-${Date.now()}.${extension}`, durationSec)
                .then((attachment) => handleSubmit([attachment]))
                .catch(showError)
            }}
          />
        )}

        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          disabled={disabled}
          onClick={() => void handleSubmit()}
        />
      </Space.Compact>
    </div>
  )
}
