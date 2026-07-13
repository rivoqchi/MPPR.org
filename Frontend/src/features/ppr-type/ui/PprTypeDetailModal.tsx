import { DownloadOutlined, EditOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons'
import { App, Button, Descriptions, Empty, List, Modal, Space, Tag } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprType, PprTypeFile } from '@/entities/ppr-type/model/types'
import {
  canOpenFilePreview,
  downloadPprTypeFile,
  formatFileSize,
} from '@/features/ppr-type/lib/file-utils'
import { PprTypeFilePreviewModal } from '@/features/ppr-type/ui/PprTypeFilePreviewModal'
import { HighlightText } from '@/shared/ui/HighlightText'

interface PprTypeDetailModalProps {
  open: boolean
  pprType: PprType | null
  searchQuery?: string
  ownerLabel?: string
  showOwner?: boolean
  onClose: () => void
  onEdit?: () => void
}

export function PprTypeDetailModal({
  open,
  pprType,
  searchQuery = '',
  ownerLabel,
  showOwner = false,
  onClose,
  onEdit,
}: PprTypeDetailModalProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const [previewFile, setPreviewFile] = useState<PprTypeFile | null>(null)

  const handleDownload = async (file: PprTypeFile) => {
    const downloaded = await downloadPprTypeFile(file)

    if (!downloaded) {
      notification.error({
        message: t('pprType.fileActions.downloadUnavailable'),
        description: t('pprType.fileActions.downloadUnavailableHint'),
      })
    }
  }

  const handlePreview = (file: PprTypeFile) => {
    if (!canOpenFilePreview(file)) {
      notification.error({
        message: t('pprType.fileActions.previewUnavailable'),
      })
      return
    }

    setPreviewFile(file)
  }

  return (
    <>
      <Modal
        open={open}
        title={
          pprType ? (
            <HighlightText text={pprType.originalName} query={searchQuery} />
          ) : (
            t('pprType.detail.title')
          )
        }
        onCancel={onClose}
        width={760}
        footer={
          <Space>
            <Button onClick={onClose}>{t('pprType.detail.close')}</Button>
            {onEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                {t('pprType.edit')}
              </Button>
            )}
          </Space>
        }
      >
        {pprType && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Tag color="blue">
                <HighlightText text={pprType.shortName} query={searchQuery} />
              </Tag>
            </div>

            <Descriptions
              column={1}
              bordered
              items={[
                {
                  key: 'originalName',
                  label: t('pprType.fields.originalName'),
                  children: <HighlightText text={pprType.originalName} query={searchQuery} />,
                },
                {
                  key: 'shortName',
                  label: t('pprType.fields.shortName'),
                  children: <HighlightText text={pprType.shortName} query={searchQuery} />,
                },
                {
                  key: 'description',
                  label: t('pprType.fields.description'),
                  children: (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <HighlightText text={pprType.description} query={searchQuery} />
                    </div>
                  ),
                },
                ...(showOwner
                  ? [
                      {
                        key: 'owner',
                        label: t('pprType.columns.owner'),
                        children: (
                          <HighlightText text={ownerLabel ?? ''} query={searchQuery} />
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'createdAt',
                  label: t('pprType.fields.createdAt'),
                  children: dayjs(pprType.createdAt).format('DD.MM.YYYY HH:mm'),
                },
                {
                  key: 'updatedAt',
                  label: t('pprType.fields.updatedAt'),
                  children: dayjs(pprType.updatedAt).format('DD.MM.YYYY HH:mm'),
                },
              ]}
            />

            <div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                {t('pprType.fields.files')} ({pprType.files.length})
              </div>

              {pprType.files.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('pprType.detail.emptyFiles')}
                />
              ) : (
                <List
                  bordered
                  dataSource={pprType.files}
                  renderItem={(file) => (
                    <List.Item
                      actions={[
                        canOpenFilePreview(file) ? (
                          <Button
                            key="view"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreview(file)}
                          >
                            {t('pprType.fileActions.view')}
                          </Button>
                        ) : null,
                        <Button
                          key="download"
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => void handleDownload(file)}
                        >
                          {t('pprType.fileActions.download')}
                        </Button>,
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={<FileOutlined style={{ fontSize: 20 }} />}
                        title={<HighlightText text={file.name} query={searchQuery} />}
                        description={formatFileSize(file.size)}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Space>
        )}
      </Modal>

      <PprTypeFilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </>
  )
}
