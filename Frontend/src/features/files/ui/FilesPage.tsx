import { PlusOutlined } from '@ant-design/icons'
import { Button, Space, Table, Tag, Typography, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getDocumentFileIcon } from '@/features/documents/lib/document-file-icon'
import { DocumentRowActions } from '@/features/documents/ui/DocumentRowActions'
import { FilesUploadModal } from '@/features/files/ui/FilesUploadModal'
import { useAuthStore } from '@/entities/user/model/auth-store'
import {
  deleteDocument,
  downloadDocument,
  isDocxDocument,
  listDocuments,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import {
  getSplitPanelSurfaceStyle,
  pageToolbarActionStyle,
  pageToolbarStyle,
  scrollablePageStyle,
} from '@/shared/lib/page-layout'
import { formatStoredFileSize } from '@/shared/lib/stored-file-utils'
import { RequirePageView } from '@/shared/ui/RequirePageView'

const PAGE_KEY = '/files'

export function FilesPage() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.currentUser)
  const { canCreate, canDelete, role } = useRolePermissions()
  const canAdd = canCreate(PAGE_KEY)
  const canRemovePage = canDelete(PAGE_KEY)
  const [documents, setDocuments] = useState<UserDocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const canDeleteRecord = useCallback(
    (record: UserDocumentSummary) =>
      canRemovePage && (record.createdById === currentUser?.id || role?.isSystem === true),
    [canRemovePage, currentUser?.id, role?.isSystem],
  )

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)

    try {
      const items = await listDocuments('FILE')
      setDocuments(items)
    } catch {
      message.error(t('files.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const handleEdit = useCallback(
    (record: UserDocumentSummary) => {
      if (!isDocxDocument(record)) {
        message.warning(t('files.openNotSupported'))
        return
      }

      navigate(`/documents/${record.id}`)
    },
    [navigate, t],
  )

  const handleDownload = useCallback(
    async (record: UserDocumentSummary) => {
      try {
        await downloadDocument(record.id, record.title)
      } catch {
        message.error(t('files.downloadError'))
      }
    },
    [t],
  )

  const handleDelete = useCallback(
    async (record: UserDocumentSummary) => {
      try {
        await deleteDocument(record.id)
        message.success(t('files.deleteSuccess'))
        await loadDocuments()
      } catch {
        message.error(t('files.deleteError'))
      }
    },
    [loadDocuments, t],
  )

  const columns = useMemo<ColumnsType<UserDocumentSummary>>(
    () => [
      {
        title: '#',
        width: 64,
        render: (_, __, index) => index + 1,
      },
      {
        title: t('files.columns.name'),
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (title: string, record) => {
          const editable = isDocxDocument(record)

          return (
            <Space size={8}>
              {getDocumentFileIcon(title, record.mimeType)}
              {editable ? (
                <Typography.Link onClick={() => handleEdit(record)}>{title}</Typography.Link>
              ) : (
                <span>{title}</span>
              )}
              {record.isServiceFile ? (
                <Tag color="blue">{t('files.serviceFileBadge')}</Tag>
              ) : null}
            </Space>
          )
        },
      },
      {
        title: t('files.columns.size'),
        dataIndex: 'size',
        key: 'size',
        width: 120,
        render: (size: number) => formatStoredFileSize(size),
      },
      {
        title: t('files.columns.uploadedAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      },
      {
        title: t('files.columns.actions'),
        key: 'actions',
        width: 132,
        align: 'right',
        render: (_, record) => (
          <DocumentRowActions
            record={record}
            deleteConfirmKey="files.deleteConfirm"
            downloadLabelKey="files.actions.download"
            editLabelKey="files.actions.edit"
            deleteLabelKey="files.actions.delete"
            openNotSupportedKey="files.openNotSupported"
            onDownload={(item) => {
              void handleDownload(item)
            }}
            onDelete={(item) => {
              void handleDelete(item)
            }}
            onEdit={handleEdit}
            canDelete={canDeleteRecord(record)}
          />
        ),
      },
    ],
    [canDeleteRecord, handleDelete, handleDownload, handleEdit, t],
  )

  return (
    <RequirePageView pageKey={PAGE_KEY}>
      <div style={scrollablePageStyle}>
        <div style={pageToolbarStyle}>
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {t('files.title')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('files.subtitle')}</Typography.Text>
          </div>
          {canAdd ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={pageToolbarActionStyle}
              onClick={() => setUploadOpen(true)}
            >
              {t('files.add')}
            </Button>
          ) : null}
        </div>

        <div style={getSplitPanelSurfaceStyle(token)}>
          <Table<UserDocumentSummary>
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={documents}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            onRow={(record) => ({
              onDoubleClick: () => handleEdit(record),
              style: isDocxDocument(record) ? { cursor: 'pointer' } : undefined,
            })}
          />
        </div>

        <FilesUploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            void loadDocuments()
          }}
        />
      </div>
    </RequirePageView>
  )
}
