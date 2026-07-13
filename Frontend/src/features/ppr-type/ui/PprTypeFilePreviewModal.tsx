import { DownloadOutlined } from '@ant-design/icons'
import { App, Button, Image, Modal, Space, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprTypeFile } from '@/entities/ppr-type/model/types'
import {
  downloadPprTypeFile,
  getPprTypeFilePreviewUrl,
} from '@/features/ppr-type/lib/file-utils'

interface PprTypeFilePreviewModalProps {
  file: PprTypeFile | null
  onClose: () => void
}

export function PprTypeFilePreviewModal({ file, onClose }: PprTypeFilePreviewModalProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    const loadPreview = async () => {
      if (!file) {
        setPreviewUrl(null)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        objectUrl = await getPprTypeFilePreviewUrl(file)

        if (active) {
          setPreviewUrl(objectUrl)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      active = false

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [file])

  const handleDownload = async () => {
    if (!file) {
      return
    }

    const downloaded = await downloadPprTypeFile(file)

    if (!downloaded) {
      notification.error({
        message: t('pprType.fileActions.downloadUnavailable'),
        description: t('pprType.fileActions.downloadUnavailableHint'),
      })
    }
  }

  const renderPreview = () => {
    if (!file) {
      return null
    }

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spin />
        </div>
      )
    }

    if (!previewUrl) {
      return (
        <Typography.Text type="secondary">
          {t('pprType.fileActions.previewUnavailable')}
        </Typography.Text>
      )
    }

    if (file.mimeType.startsWith('image/')) {
      return (
        <Image
          src={previewUrl}
          alt={file.name}
          style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }}
          preview={false}
        />
      )
    }

    if (file.mimeType === 'application/pdf') {
      return (
        <iframe
          title={file.name}
          src={previewUrl}
          style={{ width: '100%', height: '75vh', border: 'none' }}
        />
      )
    }

    return (
      <Typography.Text type="secondary">
        {t('pprType.fileActions.previewUnsupported')}
      </Typography.Text>
    )
  }

  return (
    <Modal
      open={Boolean(file)}
      title={file?.name}
      onCancel={onClose}
      width="min(960px, 92vw)"
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>{t('pprType.detail.close')}</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!file}
            onClick={() => void handleDownload()}
          >
            {t('pprType.fileActions.download')}
          </Button>
        </Space>
      }
    >
      {renderPreview()}
    </Modal>
  )
}
