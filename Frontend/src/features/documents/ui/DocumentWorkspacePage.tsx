import {
  ArrowLeftOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { Alert, App, Button, Space, Typography, Upload, theme } from 'antd'
import type { UploadProps } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentDocxPreview } from '@/features/documents/ui/DocumentDocxPreview'
import {
  downloadDocument,
  getDocumentById,
  isDocxFileName,
  replaceDocumentFile,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'
import { resolveApiErrorMessage } from '@/shared/lib/api-error'
import {
  fullHeightPageStyle,
  getSplitPanelSurfaceStyle,
  pageToolbarActionStyle,
  pageToolbarStyle,
} from '@/shared/lib/page-layout'

interface DocumentWorkspacePageProps {
  backPath?: string
  backLabelKey?: string
  titleKey?: string
  hintKey?: string
}

export function DocumentWorkspacePage({
  backPath = '/files',
  backLabelKey = 'files.backToList',
  titleKey = 'documents.workspaceTitle',
  hintKey = 'documents.workspaceHint',
}: DocumentWorkspacePageProps) {
  const { notification } = App.useApp()
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { documentId } = useParams<{ documentId: string }>()
  const [document, setDocument] = useState<UserDocumentSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)

  const loadDocument = useCallback(async () => {
    if (!documentId) {
      setErrorMessage(t('documents.loadError'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await getDocumentById(documentId)
      setDocument(result)
    } catch (error: unknown) {
      setErrorMessage(resolveApiErrorMessage(error, t, 'documents.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [documentId, t])

  useEffect(() => {
    void loadDocument()
  }, [loadDocument])

  const handleDownload = useCallback(async () => {
    if (!document) {
      return
    }

    setIsDownloading(true)

    try {
      await downloadDocument(document.id, document.title)
      notification.success({
        message: t('documents.downloadSuccess'),
        duration: 3,
      })
    } catch (error: unknown) {
      notification.error({
        message: resolveApiErrorMessage(error, t, 'documents.downloadError'),
        duration: 4,
      })
    } finally {
      setIsDownloading(false)
    }
  }, [document, notification, t])

  const handleReplaceUpload: UploadProps['customRequest'] = async (options) => {
    if (!document || !(options.file instanceof File)) {
      options.onError?.(new Error('Invalid file'))
      return
    }

    setIsUploading(true)

    try {
      const updated = await replaceDocumentFile(document.id, options.file)
      setDocument(updated)
      setPreviewRefreshKey((value) => value + 1)
      notification.success({
        message: t('documents.uploadSuccess'),
        duration: 3,
      })
      options.onSuccess?.(updated)
    } catch (error: unknown) {
      notification.error({
        message: resolveApiErrorMessage(error, t, 'documents.uploadError'),
        duration: 4,
      })
      options.onError?.(error as Error)
    } finally {
      setIsUploading(false)
    }
  }

  if (errorMessage) {
    return (
      <div style={fullHeightPageStyle}>
        <Alert type="error" message={errorMessage} showIcon />
      </div>
    )
  }

  const canPreview = document ? isDocxFileName(document.title) : false

  const toolbarActions = (
    <Space wrap style={pageToolbarActionStyle}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}>
        {t(backLabelKey)}
      </Button>

      <Button
        icon={<DownloadOutlined />}
        loading={isDownloading}
        disabled={!document || isLoading}
        onClick={() => void handleDownload()}
      >
        {t('documents.downloadFile')}
      </Button>

      <Upload
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        showUploadList={false}
        customRequest={handleReplaceUpload}
        disabled={!document || isLoading || isUploading}
      >
        <Button icon={<UploadOutlined />} loading={isUploading}>
          {t('documents.uploadNewVersion')}
        </Button>
      </Upload>
    </Space>
  )

  return (
    <div style={fullHeightPageStyle}>
      <div style={pageToolbarStyle}>
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {document?.title ?? t(titleKey)}
          </Typography.Title>
          <Typography.Text type="secondary">{t(hintKey)}</Typography.Text>
        </div>
        {toolbarActions}
      </div>

      <div style={{ ...getSplitPanelSurfaceStyle(token), flex: 1, minHeight: 0, display: 'flex' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>{t('documents.previewLoading')}</div>
        ) : canPreview ? (
          <DocumentDocxPreview documentId={document!.id} refreshKey={previewRefreshKey} />
        ) : (
          <div style={{ padding: 24 }}>
            <Alert
              type="info"
              showIcon
              message={t('documents.previewUnsupported')}
              description={t('documents.previewUnsupportedHint')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
