import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  EyeOutlined,
  FileOutlined,
} from '@ant-design/icons'
import { App, Button, Descriptions, Empty, List, Popconfirm, Space, Tag, theme } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ObjectDocument, RegisteredObject } from '@/entities/object/model/types'
import {
  downloadObjectDocument,
  formatDocumentSize,
} from '@/features/object/lib/document-utils'
import { getYandexMapLink } from '@/features/object/lib/yandex-maps'
import {
  canOpenDocumentPreview,
  ObjectDocumentModal,
} from '@/features/object/ui/ObjectDocumentModal'
import { YandexMapPicker } from '@/features/object/ui/YandexMapPicker'
import {
  getSplitDetailPanelCardStyle,
  splitDetailPanelScrollStyle,
  splitPanelScrollStyle,
  splitPanelShellStyle,
} from '@/shared/lib/page-layout'

interface ObjectDetailProps {
  object?: RegisteredObject
  canManage?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ObjectDetail({ object, canManage = false, onEdit, onDelete }: ObjectDetailProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const [previewDocument, setPreviewDocument] = useState<ObjectDocument | null>(null)

  const handleDownload = async (document: ObjectDocument) => {
    const downloaded = await downloadObjectDocument(document)

    if (!downloaded) {
      notification.error({
        message: t('object.documents.downloadUnavailable'),
      })
    }
  }

  const handlePreview = (document: ObjectDocument) => {
    if (!canOpenDocumentPreview(document)) {
      notification.error({
        message: t('object.documents.previewUnavailable'),
      })
      return
    }

    setPreviewDocument(document)
  }

  if (!object) {
    return (
      <div
        style={{
          ...splitPanelShellStyle,
          background: token.colorBgLayout,
        }}
      >
        <div
          style={{
            ...splitPanelScrollStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty description={t('object.selectItem')} />
        </div>
      </div>
    )
  }

  const mapLink = getYandexMapLink(object.location.latitude, object.location.longitude)

  return (
    <>
      <div
        style={{
          ...splitPanelShellStyle,
          background: token.colorBgLayout,
        }}
      >
        <div style={splitDetailPanelScrollStyle}>
        <div style={getSplitDetailPanelCardStyle(token)}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{object.originalName}</div>
              <Tag color="blue" style={{ marginTop: 8 }}>
                {object.shortName}
              </Tag>
            </div>

            {canManage && (
              <Space>
                {onEdit && (
                  <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                    {t('object.edit')}
                  </Button>
                )}
                {onDelete && (
                  <Popconfirm
                    title={t('object.deleteConfirm')}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    onConfirm={onDelete}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      {t('object.delete')}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </div>

          <Descriptions
            column={1}
            bordered
            items={[
              {
                key: 'originalName',
                label: t('object.fields.originalName'),
                children: object.originalName,
              },
              {
                key: 'shortName',
                label: t('object.fields.shortName'),
                children: object.shortName,
              },
              {
                key: 'address',
                label: t('object.fields.address'),
                children: (
                  <Space>
                    <EnvironmentOutlined />
                    <span>{object.location.address}</span>
                    <Button
                      type="link"
                      size="small"
                      icon={<ExportOutlined />}
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('object.openInMaps')}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{t('object.fields.location')}</div>
            <YandexMapPicker value={object.location} onChange={() => undefined} readOnly height={280} />
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {t('object.fields.documents')} ({object.documents.length})
            </div>

            {object.documents.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('object.emptyDocuments')}
              />
            ) : (
              <List
                bordered
                dataSource={object.documents}
                renderItem={(document) => (
                  <List.Item
                    actions={[
                      canOpenDocumentPreview(document) ? (
                        <Button
                          key="view"
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(document)}
                        >
                          {t('object.documents.view')}
                        </Button>
                      ) : null,
                      <Button
                        key="download"
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={() => void handleDownload(document)}
                      >
                        {t('object.documents.download')}
                      </Button>,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={<FileOutlined style={{ fontSize: 20 }} />}
                      title={document.name}
                      description={formatDocumentSize(document.size)}
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
      </div>
      </div>

      <ObjectDocumentModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
    </>
  )
}
