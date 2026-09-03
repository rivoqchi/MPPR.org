import {
  ArrowLeftOutlined,
  CompressOutlined,
  ExpandOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { Alert, Button, Space, message, theme, Tooltip, Typography } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DocumentDocxEditorWorkspace,
  type DocumentDocxEditorHandle,
} from '@/features/documents/ui/DocumentDocxEditorWorkspace'
import {
  fetchDocumentPreviewBlob,
  getDocumentById,
  isDocxDocument,
  saveDocumentDocxBytes,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'
import { resolveApiErrorMessage } from '@/shared/lib/api-error'
import {
  fullHeightPageStyle,
  getSplitPanelSurfaceStyle,
  pageToolbarActionStyle,
  pageToolbarStyle,
} from '@/shared/lib/page-layout'
import { useElementFullscreen } from '@/features/documents/lib/use-element-fullscreen'

export function DocumentEditorPage() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { documentId } = useParams<{ documentId: string }>()
  const editorRef = useRef<DocumentDocxEditorHandle>(null)
  const [userDocument, setUserDocument] = useState<UserDocumentSummary | null>(null)
  const [title, setTitle] = useState('')
  const [documentBytes, setDocumentBytes] = useState<Uint8Array | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const { ref: fullscreenRef, isFullscreen, toggleFullscreen } = useElementFullscreen<HTMLDivElement>()

  const handleSave = useCallback(async () => {
    if (!documentId || !userDocument) {
      return
    }

    const bytes = await editorRef.current?.save()
    if (!bytes?.length) {
      message.warning(t('documents.emptyDocumentWarning'))
      return
    }

    setIsSaving(true)

    try {
      const updated = await saveDocumentDocxBytes(
        userDocument.id,
        bytes,
        title.trim() || userDocument.title,
      )
      setUserDocument(updated)
      message.success(t('documents.docxEditorSaveSuccess'))
    } catch (error: unknown) {
      message.error(resolveApiErrorMessage(error, t, 'documents.saveError'))
    } finally {
      setIsSaving(false)
    }
  }, [documentId, message, t, title, userDocument])

  useEffect(() => {
    if (!documentId) {
      setErrorMessage(t('documents.loadError'))
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadDocument() {
      if (!documentId) {
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      setDocumentBytes(undefined)

      try {
        const meta = await getDocumentById(documentId)
        if (cancelled) {
          return
        }

        setUserDocument(meta)
        setTitle(meta.title)

        if (!isDocxDocument(meta)) {
          setErrorMessage(t('documents.previewUnsupported'))
          return
        }

        const blob = await fetchDocumentPreviewBlob(documentId)
        if (cancelled) {
          return
        }

        const buffer = await blob.arrayBuffer()
        setDocumentBytes(new Uint8Array(buffer.slice(0)))
      } catch (error: unknown) {
        if (!cancelled) {
          setErrorMessage(resolveApiErrorMessage(error, t, 'documents.loadError'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDocument()

    return () => {
      cancelled = true
    }
  }, [documentId, t])

  const isImmersive = isExpanded || isFullscreen

  useEffect(() => {
    if (!isImmersive) {
      return
    }

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 150)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isImmersive])

  useEffect(() => {
    return () => {
      if (window.document.fullscreenElement) {
        void window.document.exitFullscreen().catch(() => undefined)
      }
    }
  }, [])

  if (errorMessage) {
    return (
      <div style={fullHeightPageStyle}>
        <Alert type="error" message={errorMessage} showIcon />
      </div>
    )
  }

  const editorActions = (
    <Space wrap style={pageToolbarActionStyle}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/files')}>
        {t('files.backToList')}
      </Button>

      <Button
        type="default"
        icon={<SaveOutlined />}
        loading={isSaving}
        disabled={isLoading || !documentBytes}
        onClick={() => void handleSave()}
      >
        {t('documents.saveFile')}
      </Button>

      {!isImmersive ? (
        <Tooltip title={t('documents.expand')}>
          <Button
            icon={<ExpandOutlined />}
            onClick={() => setIsExpanded(true)}
            aria-label={t('documents.expand')}
          />
        </Tooltip>
      ) : (
        <Tooltip title={t('documents.collapse')}>
          <Button
            icon={<CompressOutlined />}
            onClick={() => {
              setIsExpanded(false)
              if (window.document.fullscreenElement) {
                void window.document.exitFullscreen().catch(() => undefined)
              }
            }}
            aria-label={t('documents.collapse')}
          />
        </Tooltip>
      )}

      <Tooltip title={isFullscreen ? t('documents.exitFullscreen') : t('documents.enterFullscreen')}>
        <Button
          type="primary"
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true)
            }
            void toggleFullscreen()
          }}
        >
          {isFullscreen ? t('documents.exitFullscreen') : t('documents.enterFullscreen')}
        </Button>
      </Tooltip>
    </Space>
  )

  return (
    <div style={fullHeightPageStyle}>
      {!isImmersive ? (
        <div style={pageToolbarStyle}>
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {t('documents.editorTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('documents.editorHint')}</Typography.Text>
          </div>
          {editorActions}
        </div>
      ) : null}

      <div
        ref={fullscreenRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          ...(isImmersive
            ? {
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                width: '100vw',
                height: '100vh',
                background: token.colorBgContainer,
                overflow: 'hidden',
              }
            : {
                ...getSplitPanelSurfaceStyle(token),
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }),
        }}
      >
        {isImmersive ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexShrink: 0,
              padding: '10px 16px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t('documents.editorTitle')}
            </Typography.Title>
            {editorActions}
          </div>
        ) : null}

        <DocumentDocxEditorWorkspace
          key={userDocument?.id ?? documentId ?? 'loading'}
          ref={editorRef}
          documentBytes={documentBytes}
          title={title}
          onTitleChange={setTitle}
          isLoading={isLoading}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
