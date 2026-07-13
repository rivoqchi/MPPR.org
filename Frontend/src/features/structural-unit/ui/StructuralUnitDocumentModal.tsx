import { DownloadOutlined } from '@ant-design/icons'
import { Button, Image, Modal, Skeleton, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StructuralUnitDocument } from '@/entities/structural-unit/model/types'
import {
  downloadStructuralUnitDocument,
  getDocumentPreviewUrl,
  isPreviewableDocument,
  resolveDocumentMimeType,
} from '@/features/structural-unit/lib/document-utils'

interface StructuralUnitDocumentModalProps {
  document: StructuralUnitDocument | null
  onClose: () => void
}

export function StructuralUnitDocumentModal({
  document,
  onClose,
}: StructuralUnitDocumentModalProps) {
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

    await downloadStructuralUnitDocument(document)
  }

  const renderPreview = () => {
    if (isLoading) {
      return <Skeleton.Image active style={{ width: '100%', height: 420 }} />
    }

    if (!previewUrl || !document) {
      return (
        <Typography.Text type="secondary">
          {t('structuralUnit.documents.previewUnavailable')}
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
        {t('structuralUnit.documents.previewUnsupported')}
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
            {t('structuralUnit.documents.download')}
          </Button>
        </Space>
      }
    >
      {renderPreview()}
    </Modal>
  )
}

export function canOpenDocumentPreview(document: StructuralUnitDocument): boolean {
  return isPreviewableDocument(resolveDocumentMimeType(document))
}
