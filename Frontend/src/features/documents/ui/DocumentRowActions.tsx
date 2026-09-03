import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Modal, Space, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  isDocxDocument,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'

interface DocumentRowActionsProps {
  record: UserDocumentSummary
  deleteConfirmKey: string
  downloadLabelKey: string
  editLabelKey: string
  deleteLabelKey: string
  openNotSupportedKey?: string
  onDownload: (record: UserDocumentSummary) => void
  onDelete: (record: UserDocumentSummary) => void
  onEdit: (record: UserDocumentSummary) => void
  canDelete: boolean
  /** Prefer visible icon buttons (default) over a compact menu. */
  variant?: 'buttons' | 'menu'
}

export function DocumentRowActions({
  record,
  deleteConfirmKey,
  downloadLabelKey,
  editLabelKey,
  deleteLabelKey,
  openNotSupportedKey = 'files.openNotSupported',
  onDownload,
  onDelete,
  onEdit,
  canDelete,
  variant = 'buttons',
}: DocumentRowActionsProps) {
  const { t } = useTranslation()
  const canEdit = isDocxDocument(record)

  const confirmDelete = useCallback(() => {
    Modal.confirm({
      title: t(deleteConfirmKey),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      onOk: () => onDelete(record),
    })
  }, [deleteConfirmKey, onDelete, record, t])

  const handleEdit = useCallback(() => {
    if (canEdit) {
      onEdit(record)
    }
  }, [canEdit, onEdit, record])

  const menuItems = useMemo<MenuProps['items']>(() => {
    const items: MenuProps['items'] = [
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: t(downloadLabelKey),
        onClick: () => onDownload(record),
      },
    ]

    if (canEdit) {
      items.push({
        key: 'edit',
        icon: <EditOutlined />,
        label: t(editLabelKey),
        onClick: handleEdit,
      })
    }

    if (canDelete) {
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: t(deleteLabelKey),
        danger: true,
        onClick: confirmDelete,
      })
    }

    return items
  }, [
    canDelete,
    canEdit,
    confirmDelete,
    deleteLabelKey,
    downloadLabelKey,
    editLabelKey,
    handleEdit,
    onDownload,
    record,
    t,
  ])

  if (variant === 'menu') {
    return (
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button type="text" icon={<MoreOutlined />} aria-label={t(editLabelKey)} />
      </Dropdown>
    )
  }

  return (
    <Space size={4} onClick={(event) => event.stopPropagation()}>
      <Tooltip title={canEdit ? t(editLabelKey) : t(openNotSupportedKey)}>
        <Button
          type="text"
          icon={<EditOutlined />}
          disabled={!canEdit}
          aria-label={t(editLabelKey)}
          onClick={handleEdit}
        />
      </Tooltip>

      <Tooltip title={t(downloadLabelKey)}>
        <Button
          type="text"
          icon={<DownloadOutlined />}
          aria-label={t(downloadLabelKey)}
          onClick={() => onDownload(record)}
        />
      </Tooltip>

      {canDelete ? (
        <Tooltip title={t(deleteLabelKey)}>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={t(deleteLabelKey)}
            onClick={confirmDelete}
          />
        </Tooltip>
      ) : null}
    </Space>
  )
}
