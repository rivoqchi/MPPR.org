import { DownloadOutlined } from '@ant-design/icons'
import { Button, Image, Modal, Skeleton, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ObjectDocument } from '@/entities/object/model/types'
import {
  downloadObjectDocument,
  getDocumentPreviewUrl,
  isPreviewableDocument,
  resolveDocumentMimeType,
} from '@/features/object/lib/document-utils'

interface ObjectDocumentModalProps {
  document: ObjectDocument | null
  onClose: () => void
}

export function ObjectDocumentModal({ document, onClose }: ObjectDocumentModalProps) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!document) {
      setPreviewUrl(null)
      return
    }

    let isActive = true
    let objectUrl: string | null = null

    setIsLoading(true)

    getDocumentPreviewUrl(document)
      .then((url) => {
        if (!isActive) {
          if (url) {
            URL.revokeObjectURL(url)
          }
          return
        }

        objectUrl = url
        setPreviewUrl(url)
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

      setPreviewUrl(null)
    }
  }, [document])

  const handleDownload = async () => {
    if (!document) {
      return
    }

    await downloadObjectDocument(document)
  }

  const renderPreview = () => {
    if (isLoading) {
      return <Skeleton.Image active style={{ width: '100%', height: 420 }} />
    }

    if (!previewUrl || !document) {
      return (
        <Typography.Text type="secondary">
          {t('object.documents.previewUnavailable')}
        </Typography.Text>
      )
    }

    const mimeType = resolveDocumentMimeType(document)

    if (mimeType.startsWith('image/')) {
      return (
        <Image
          src={previewUrl}
          alt={document.name}
          style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }}
          preview={false}
        />
      )
    }

    if (mimeType === 'application/pdf') {
      return (
        <iframe
          title={document.name}
          src={previewUrl}
          style={{ width: '100%', height: '75vh', border: 'none' }}
        />
      )
    }

    return (
      <Typography.Text type="secondary">
        {t('object.documents.previewUnsupported')}
      </Typography.Text>
    )
  }

  return (
    <Modal
      open={Boolean(document)}
      title={document?.name}
      onCancel={onClose}
      width="min(960px, 92vw)"
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            {t('object.documents.download')}
          </Button>
        </Space>
      }
    >
      {renderPreview()}
    </Modal>
  )
}

export function canOpenDocumentPreview(document: ObjectDocument): boolean {
  return isPreviewableDocument(resolveDocumentMimeType(document))
}
