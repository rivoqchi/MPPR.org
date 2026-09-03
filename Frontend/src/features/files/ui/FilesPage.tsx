import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { App, Button, Space, Table, Tag, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DocumentExpandedPanel } from '@/features/documents/ui/DocumentExpandedPanel'
import {
  DocumentsListFilters,
  matchesDocumentSearch,
  matchesServiceFileFilter,
  type ServiceFileFilter,
} from '@/features/documents/ui/DocumentsListFilters'
import { useSmoothTableExpand } from '@/features/documents/lib/use-smooth-table-expand'
import { FilesUploadModal } from '@/features/files/ui/FilesUploadModal'
import { useAuthStore } from '@/entities/user/model/auth-store'
import {
  deleteDocument,
  downloadDocument,
  isOnlyOfficeEditableDocument,
  listDocuments,
  updateDocumentServiceFile,
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
import { DocumentsListPageSkeleton } from '@/shared/ui/skeleton'

const PAGE_KEY = '/files'

export function FilesPage() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.currentUser)
  const { canCreate, canDelete, role } = useRolePermissions()
  const canAdd = canCreate(PAGE_KEY)
  const canRemovePage = canDelete(PAGE_KEY)
  const [documents, setDocuments] = useState<UserDocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [serviceFilter, setServiceFilter] = useState<ServiceFileFilter>('all')
  const { expandedRowKeys, panelOpen, onExpandedRowsChange, collapseRow } = useSmoothTableExpand()

  const canDeleteRecord = useCallback(
    (record: UserDocumentSummary) =>
      canRemovePage && (record.createdById === currentUser?.id || role?.isSystem === true),
    [canRemovePage, currentUser?.id, role?.isSystem],
  )

  const canManageServiceFile = useCallback(
    (record: UserDocumentSummary) =>
      record.createdById === currentUser?.id || role?.isSystem === true,
    [currentUser?.id, role?.isSystem],
  )

  const loadDocuments = useCallback(async () => {
    try {
      const items = await listDocuments('FILE')
      setDocuments(items)
    } catch {
      message.error(t('files.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [message, t])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (item) =>
          matchesDocumentSearch(item, searchValue) &&
          matchesServiceFileFilter(item.isServiceFile, serviceFilter),
      ),
    [documents, searchValue, serviceFilter],
  )

  const handleOpen = useCallback(
    (record: UserDocumentSummary) => {
      if (!isOnlyOfficeEditableDocument(record.title, record.mimeType)) {
        message.warning(t('files.openNotSupported'))
        return
      }
      navigate(`/documents/${record.id}`)
    },
    [message, navigate, t],
  )

  const handleDownload = useCallback(
    async (record: UserDocumentSummary) => {
      try {
        await downloadDocument(record.id, record.title)
      } catch {
        message.error(t('files.downloadError'))
      }
    },
    [message, t],
  )

  const handleDelete = useCallback(
    async (record: UserDocumentSummary) => {
      try {
        await deleteDocument(record.id)
        message.success(t('files.deleteSuccess'))
        collapseRow(record.id)
        await loadDocuments()
      } catch {
        message.error(t('files.deleteError'))
      }
    },
    [collapseRow, loadDocuments, message, t],
  )

  const handleServiceFileChange = useCallback(
    async (record: UserDocumentSummary, isServiceFile: boolean) => {
      try {
        const updated = await updateDocumentServiceFile(record.id, isServiceFile)
        setDocuments((items) => items.map((item) => (item.id === updated.id ? updated : item)))
        message.success(
          isServiceFile
            ? t('documents.serviceFileEnabled')
            : t('documents.serviceFileDisabled'),
        )
      } catch {
        message.error(t('documents.serviceFileUpdateError'))
        throw new Error('SERVICE_FILE_UPDATE_FAILED')
      }
    },
    [message, t],
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
        render: (title: string, record) => (
          <Space size={8}>
            <span>{title}</span>
            {record.isServiceFile ? (
              <Tag color="blue">{t('files.serviceFileBadge')}</Tag>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('files.columns.uploadedBy'),
        key: 'uploadedBy',
        width: 200,
        ellipsis: true,
        render: (_, record) =>
          `${record.createdBy.firstName} ${record.createdBy.lastName}`.trim(),
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
    ],
    [t],
  )

  if (isLoading) {
    return (
      <RequirePageView pageKey={PAGE_KEY}>
        <DocumentsListPageSkeleton />
      </RequirePageView>
    )
  }

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
            <Space style={pageToolbarActionStyle} wrap>
              <Button icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
                {t('files.uploadExisting')}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/documents/new')}>
                {t('files.createNew')}
              </Button>
            </Space>
          ) : null}
        </div>

        <DocumentsListFilters
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          searchPlaceholderKey="files.filters.search"
        />

        <div style={getSplitPanelSurfaceStyle(token)}>
          <Table<UserDocumentSummary>
            rowKey="id"
            columns={columns}
            dataSource={filteredDocuments}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            expandable={{
              expandedRowKeys,
              expandRowByClick: true,
              onExpandedRowsChange,
              expandedRowRender: (record) => (
                <DocumentExpandedPanel
                  record={record}
                  open={panelOpen && expandedRowKeys[0] === record.id}
                  showServiceSwitch
                  canManageServiceFile={canManageServiceFile(record)}
                  canDelete={canDeleteRecord(record)}
                  deleteConfirmKey="files.deleteConfirm"
                  onOpen={handleOpen}
                  onDownload={(item) => {
                    void handleDownload(item)
                  }}
                  onDelete={(item) => {
                    void handleDelete(item)
                  }}
                  onServiceFileChange={handleServiceFileChange}
                />
              ),
            }}
          />
        </div>

        <FilesUploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={(document) => {
            void loadDocuments()
            if (document && isOnlyOfficeEditableDocument(document.title, document.mimeType)) {
              navigate(`/documents/${document.id}`)
            }
          }}
        />
      </div>
    </RequirePageView>
  )
}
