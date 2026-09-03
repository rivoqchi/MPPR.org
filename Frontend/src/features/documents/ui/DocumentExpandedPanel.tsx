import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import { App, Button, Descriptions, Modal, Space, Switch, theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchDocumentPreviewBlob,
  isOnlyOfficeEditableDocument,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'
import { formatStoredFileSize } from '@/shared/lib/stored-file-utils'

const EXPAND_MS = 320
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const DOCUMENT_EXPAND_MS = EXPAND_MS

interface DocumentExpandedPanelProps {
  record: UserDocumentSummary
  open?: boolean
  showServiceSwitch: boolean
  canManageServiceFile: boolean
  canDelete: boolean
  deleteConfirmKey: string
  onOpen: (record: UserDocumentSummary) => void
  onDownload: (record: UserDocumentSummary) => void
  onDelete: (record: UserDocumentSummary) => void
  onServiceFileChange: (record: UserDocumentSummary, isServiceFile: boolean) => Promise<void>
}

export function DocumentExpandedPanel({
  record,
  open = true,
  showServiceSwitch,
  canManageServiceFile,
  canDelete,
  deleteConfirmKey,
  onOpen,
  onDownload,
  onDelete,
  onServiceFileChange,
}: DocumentExpandedPanelProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [isUpdatingService, setIsUpdatingService] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!open) {
      setExpanded(false)
      return
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setExpanded(true)
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [open])

  const canOpen = isOnlyOfficeEditableDocument(record.title, record.mimeType)
  const uploaderName = `${record.createdBy.firstName} ${record.createdBy.lastName}`.trim()

  const handlePrint = async () => {
    setIsPrinting(true)

    try {
      const mime = record.mimeType.toLowerCase()
      const isBrowserPrintable =
        mime.includes('pdf') || mime.startsWith('image/') || mime.startsWith('text/')

      if (isBrowserPrintable) {
        const blob = await fetchDocumentPreviewBlob(record.id)
        const url = URL.createObjectURL(blob)
        const printWindow = window.open(url, '_blank', 'noopener,noreferrer')

        if (!printWindow) {
          message.warning(t('documents.printPopupBlocked'))
          URL.revokeObjectURL(url)
          return
        }

        const revoke = () => URL.revokeObjectURL(url)
        printWindow.addEventListener('beforeunload', revoke)

        window.setTimeout(() => {
          try {
            printWindow.focus()
            printWindow.print()
          } catch {
            // Browser may block auto-print; user can print manually.
          }
        }, 500)
        return
      }

      if (canOpen) {
        onOpen(record)
        message.info(t('documents.printFromEditor'))
        return
      }

      onDownload(record)
      message.info(t('documents.printDownloadHint'))
    } catch {
      message.error(t('documents.printError'))
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transition: `grid-template-rows ${EXPAND_MS}ms ${EASE}`,
      }}
    >
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '8px 12px 14px',
            opacity: expanded ? 1 : 0,
            transform: expanded ? 'translateY(0)' : 'translateY(-8px)',
            transition: `opacity ${EXPAND_MS - 40}ms ease, transform ${EXPAND_MS}ms ${EASE}`,
          }}
        >
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            labelStyle={{ color: token.colorTextSecondary }}
          >
            <Descriptions.Item label={t('documents.details.name')}>{record.title}</Descriptions.Item>
            <Descriptions.Item label={t('documents.details.uploadedBy')}>
              {uploaderName}
            </Descriptions.Item>
            <Descriptions.Item label={t('documents.details.size')}>
              {formatStoredFileSize(record.size)}
            </Descriptions.Item>
            <Descriptions.Item label={t('documents.details.uploadedAt')}>
              {dayjs(record.createdAt).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label={t('documents.details.updatedAt')}>
              {dayjs(record.updatedAt).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            {showServiceSwitch ? (
              <Descriptions.Item label={t('documents.details.serviceFile')}>
                <Switch
                  checked={record.isServiceFile}
                  disabled={!canManageServiceFile}
                  loading={isUpdatingService}
                  checkedChildren={t('settingsPage.notifications.switchAllowed')}
                  unCheckedChildren={t('settingsPage.notifications.switchDenied')}
                  onChange={(checked) => {
                    setIsUpdatingService(true)
                    void onServiceFileChange(record, checked).finally(() => {
                      setIsUpdatingService(false)
                    })
                  }}
                />
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Space wrap size={8}>
            <Button
              type="primary"
              icon={<EditOutlined />}
              disabled={!canOpen}
              onClick={() => onOpen(record)}
            >
              {t('documents.actions.openDocument')}
            </Button>
            <Button
              icon={<PrinterOutlined />}
              loading={isPrinting}
              onClick={() => {
                void handlePrint()
              }}
            >
              {t('documents.actions.print')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => onDownload(record)}>
              {t('documents.actions.download')}
            </Button>
            {canDelete ? (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: t(deleteConfirmKey),
                    okText: t('common.yes'),
                    cancelText: t('common.no'),
                    onOk: () => onDelete(record),
                  })
                }}
              >
                {t('documents.actions.delete')}
              </Button>
            ) : null}
          </Space>
        </div>
      </div>
    </div>
  )
}
