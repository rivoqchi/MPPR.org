import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Button, Empty, Image, Space, Tag, Timeline, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarExecutionAttachment } from '@/entities/ppr-calendar/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import type { ApplicationAttachment } from '@/entities/application/model/types'
import {
  downloadApplicationAttachment,
  formatAttachmentSize,
  getAttachmentPreviewUrl,
  isImageAttachment,
  isPreviewableAttachment,
} from '@/features/application-submit/lib/attachment-utils'
import { buildExecutionTimelineSteps } from '@/features/ppr-calendar/lib/calendar-entries'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'

const { Text, Paragraph } = Typography

function toApplicationAttachment(
  attachment: PprCalendarExecutionAttachment,
): ApplicationAttachment {
  return {
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    ...(attachment.dataUrl ? { dataUrl: attachment.dataUrl } : {}),
  }
}

function TimelineAttachments({ attachments }: { attachments: PprCalendarExecutionAttachment[] }) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const imageAttachments = attachments.filter((item) => item.kind === 'image')
  const fileAttachments = attachments.filter((item) => item.kind === 'file')

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

  const handlePreview = async (attachment: PprCalendarExecutionAttachment) => {
    const normalized = toApplicationAttachment(attachment)

    if (!isPreviewableAttachment(normalized)) {
      notification.error({ message: t('applicationSubmit.attachments.previewUnavailable') })
      return
    }

    const url = await getAttachmentPreviewUrl(normalized)

    if (!url) {
      notification.error({ message: t('applicationSubmit.attachments.previewUnavailable') })
      return
    }

    if (isImageAttachment(normalized)) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(url)
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async (attachment: PprCalendarExecutionAttachment) => {
    const downloaded = await downloadApplicationAttachment(toApplicationAttachment(attachment))

    if (!downloaded) {
      notification.error({ message: t('applicationSubmit.attachments.downloadUnavailable') })
    }
  }

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {imageAttachments.length > 0 ? (
        <Image.PreviewGroup>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {imageAttachments.map((attachment) => (
              <TimelineImageThumbnail
                key={attachment.id}
                attachment={attachment}
                onPreview={() => void handlePreview(attachment)}
              />
            ))}
          </div>
        </Image.PreviewGroup>
      ) : null}

      {fileAttachments.map((attachment) => (
        <div
          key={attachment.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
            {attachment.name} ({formatAttachmentSize(attachment.size)})
          </span>
          <Space size={4}>
            {isPreviewableAttachment(toApplicationAttachment(attachment)) ? (
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => void handlePreview(attachment)}
              />
            ) : null}
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => void handleDownload(attachment)}
            />
          </Space>
        </div>
      ))}

      {previewUrl ? (
        <Image
          src={previewUrl}
          style={{ display: 'none' }}
          preview={{
            visible: Boolean(previewUrl),
            onVisibleChange: (visible) => {
              if (!visible) {
                URL.revokeObjectURL(previewUrl)
                setPreviewUrl(null)
              }
            },
          }}
        />
      ) : null}
    </Space>
  )
}

function TimelineImageThumbnail({
  attachment,
  onPreview,
}: {
  attachment: PprCalendarExecutionAttachment
  onPreview: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    void getAttachmentPreviewUrl(toApplicationAttachment(attachment)).then((url) => {
      if (!active) {
        if (url) {
          URL.revokeObjectURL(url)
        }

        return
      }

      objectUrl = url
      setSrc(url)
    })

    return () => {
      active = false

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [attachment])

  return (
    <button
      type="button"
      onClick={onPreview}
      style={{
        width: 72,
        height: 72,
        border: 'none',
        borderRadius: 8,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'rgba(0,0,0,0.06)',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={attachment.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: 11, color: '#888' }}>{attachment.name}</span>
      )}
    </button>
  )
}

interface PprCalendarExecutionTimelineProps {
  entry: PprCalendarEntry
}

export function PprCalendarExecutionTimeline({ entry }: PprCalendarExecutionTimelineProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const objects = useObjectsStore((state) => state.objects)

  const steps = useMemo(() => buildExecutionTimelineSteps(entry), [entry])

  if (steps.length === 0) {
    return <Empty description={t('pprCalendar.entryDetail.timelineEmpty')} />
  }

  return (
    <Timeline
      items={steps.map((step, index) => {
        const objectLabels = step.objectIds
          .map((objectId) => objects.find((item) => item.id === objectId)?.shortName ?? objectId)
          .join(', ')

        return {
          color: step.isCompleted ? 'green' : 'blue',
          children: (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${
                  step.isCompleted ? token.colorSuccessBorder : token.colorBorderSecondary
                }`,
                background: step.isCompleted ? token.colorSuccessBg : token.colorFillAlter,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <Text strong>
                    {t('pprCalendar.entryDetail.timelineStep', { index: index + 1 })}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(step.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  </div>
                </div>
                <Tag color={step.isCompleted ? 'success' : 'processing'}>
                  {step.completionPercent}%
                </Tag>
              </div>

              <Paragraph style={{ marginBottom: 8 }}>
                <Text type="secondary">{t('pprCalendar.entryDetail.timelineObjects')}: </Text>
                {objectLabels}
              </Paragraph>

              {step.comment ? (
                <Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                  <Text type="secondary">{t('pprCalendar.entryDetail.timelineComment')}: </Text>
                  {step.comment}
                </Paragraph>
              ) : null}

              {step.images.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">{t('pprCalendar.executionDrawer.images')}</Text>
                  <div style={{ marginTop: 6 }}>
                    <TimelineAttachments attachments={step.images} />
                  </div>
                </div>
              ) : null}

              {step.files.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">{t('pprCalendar.executionDrawer.files')}</Text>
                  <div style={{ marginTop: 6 }}>
                    <TimelineAttachments attachments={step.files} />
                  </div>
                </div>
              ) : null}

              {step.isCompleted ? (
                <div style={{ marginTop: 10 }}>
                  <Tag color="success">{t('pprCalendar.entryDetail.timelineCompleted')}</Tag>
                </div>
              ) : null}
            </div>
          ),
        }
      })}
    />
  )
}
