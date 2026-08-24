import { DownloadOutlined, EditOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons'
import { App, Button, Empty, List, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import type { StructuralUnitDocument } from '@/entities/structural-unit/model/types'
import {
  downloadStructuralUnitDocument,
  formatDocumentSize,
} from '@/features/structural-unit/lib/document-utils'
import { canOpenDocumentPreview } from '@/features/structural-unit/ui/StructuralUnitDocumentModal'

interface StructuralUnitDocumentListProps {
  documents: StructuralUnitDocument[]
  onPreview: (document: StructuralUnitDocument) => void
}

export function StructuralUnitDocumentList({
  documents,
  onPreview,
}: StructuralUnitDocumentListProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()

  const handleDownload = async (document: StructuralUnitDocument) => {
    const downloaded = await downloadStructuralUnitDocument(document)

    if (!downloaded) {
      notification.error({
        message: t('structuralUnit.documents.downloadUnavailable'),
      })
    }
  }

  if (documents.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('structuralUnit.emptyDocuments')}
      />
    )
  }

  return (
    <List
      bordered
      dataSource={documents}
      renderItem={(document) => (
        <List.Item
          actions={[
            canOpenDocumentPreview(document) ? (
              <Button
                key="view"
                type="link"
                icon={<EyeOutlined />}
                onClick={() => onPreview(document)}
              >
                {t('structuralUnit.documents.view')}
              </Button>
            ) : null,
            <Button
              key="download"
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => void handleDownload(document)}
            >
              {t('structuralUnit.documents.download')}
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
  )
}

interface StructuralUnitSectionCardProps {
  originalName: string
  shortName: string
  headFullName?: string
  documents: StructuralUnitDocument[]
  onEdit?: () => void
  onPreview: (document: StructuralUnitDocument) => void
}

export function StructuralUnitSectionCard({
  originalName,
  shortName,
  headFullName,
  documents,
  onEdit,
  onPreview,
}: StructuralUnitSectionCardProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 16,
        background: token.colorBgContainer,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{originalName}</div>
          <div style={{ color: token.colorTextSecondary, marginTop: 4 }}>{shortName}</div>
          {headFullName ? (
            <div style={{ color: token.colorTextSecondary, marginTop: 4 }}>
              {t('structuralUnit.section.fields.headUser')}: {headFullName}
            </div>
          ) : null}
        </div>

        {onEdit && (
          <Button type="link" icon={<EditOutlined />} onClick={onEdit}>
            {t('structuralUnit.section.edit')}
          </Button>
        )}
      </div>

      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        {t('structuralUnit.section.fields.documents')} ({documents.length})
      </div>

      <StructuralUnitDocumentList documents={documents} onPreview={onPreview} />
    </div>
  )
}
