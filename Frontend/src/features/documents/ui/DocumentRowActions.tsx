import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Modal } from 'antd'
import type { MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  isOnlyOfficeEditableDocument,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'

interface DocumentRowActionsProps {
  record: UserDocumentSummary
  deleteConfirmKey: string
  downloadLabelKey: string
  editLabelKey: string
  deleteLabelKey: string
  onDownload: (record: UserDocumentSummary) => void
  onDelete: (record: UserDocumentSummary) => void
  onEdit: (record: UserDocumentSummary) => void
  canDelete: boolean
}

export function DocumentRowActions({
  record,
  deleteConfirmKey,
  downloadLabelKey,
  editLabelKey,
  deleteLabelKey,
  onDownload,
  onDelete,
  onEdit,
  canDelete,
}: DocumentRowActionsProps) {
  const { t } = useTranslation()
  const canEdit = isOnlyOfficeEditableDocument(record.title, record.mimeType)

  const items: MenuProps['items'] = [
    {
      key: 'download',
      icon: <DownloadOutlined />,
      label: t(downloadLabelKey),
      onClick: () => onDownload(record),
    },
    ...(canEdit
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t(editLabelKey),
            onClick: () => onEdit(record),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: t(deleteLabelKey),
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: t(deleteConfirmKey),
                okText: t('common.yes'),
                cancelText: t('common.no'),
                onOk: () => onDelete(record),
              })
            },
          },
        ]
      : []),
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button type="text" icon={<MoreOutlined />} />
    </Dropdown>
  )
}
