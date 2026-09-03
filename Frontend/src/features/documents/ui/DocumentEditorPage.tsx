import {
  ArrowLeftOutlined,
  CompressOutlined,
  ExpandOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { Alert, Button, Space, Spin, message, theme, Tooltip, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { resolveOnlyOfficeLang } from '@/features/documents/lib/onlyoffice-lang'
import { useElementFullscreen } from '@/features/documents/lib/use-element-fullscreen'
import { useOnlyOfficeEditor } from '@/features/documents/lib/use-onlyoffice-editor'
import { getDocumentEditorConfig, getDocumentSaveState, getOnlyOfficeServerUrl, waitForDocumentSave } from '@/shared/api/documents-api'
import {
  fullHeightPageStyle,
  getSplitPanelSurfaceStyle,
  pageToolbarActionStyle,
  pageToolbarStyle,
} from '@/shared/lib/page-layout'

const EDITOR_PLACEHOLDER_ID = 'mppr-onlyoffice-editor'

export function DocumentEditorPage() {
  const { token } = theme.useToken()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { documentId } = useParams<{ documentId: string }>()
  const [editorConfig, setEditorConfig] = useState<Record<string, unknown> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const documentKeyRef = useRef('')
  const { ref: fullscreenRef, isFullscreen, toggleFullscreen } = useElementFullscreen<HTMLDivElement>()

  const onlyOfficeLang = useMemo(
    () => resolveOnlyOfficeLang(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  )

  const handleOnlyOfficeScriptError = useCallback(() => {
    setErrorMessage(t('documents.onlyOfficeUnavailable'))
  }, [t])

  const { triggerSave, isReady } = useOnlyOfficeEditor({
    placeholderId: EDITOR_PLACEHOLDER_ID,
    documentServerUrl: getOnlyOfficeServerUrl(),
    config: editorConfig,
    enabled: Boolean(editorConfig),
    onScriptError: handleOnlyOfficeScriptError,
  })

  const handleSave = useCallback(async () => {
    if (!isReady || !documentId) {
      return
    }

    setIsSaving(true)

    try {
      const previousKey = documentKeyRef.current
      triggerSave()
      const saved = await waitForDocumentSave(documentId, previousKey)
      if (saved) {
        const state = await getDocumentSaveState(documentId)
        documentKeyRef.current = state.documentKey
      }
      message.success(saved ? t('documents.saveRequested') : t('applicationSubmit.attachments.savePending'))
    } finally {
      setIsSaving(false)
    }
  }, [documentId, isReady, message, t, triggerSave])

  useEffect(() => {
    if (!documentId) {
      setErrorMessage(t('documents.loadError'))
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadEditor() {
      setIsLoading(true)
      setErrorMessage(null)
      setEditorConfig(null)

      try {
        const config = await getDocumentEditorConfig(documentId, onlyOfficeLang)

        if (!cancelled) {
          const documentKey = (config as { document?: { key?: string } }).document?.key ?? ''
          documentKeyRef.current = documentKey
          setEditorConfig(config as Record<string, unknown>)
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(t('documents.loadError'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadEditor()

    return () => {
      cancelled = true
    }
  }, [documentId, onlyOfficeLang, t])

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
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined)
      }
    }
  }, [])

  if (errorMessage) {
    return (
      <div style={fullHeightPageStyle}>
        <Alert type="error" message={errorMessage} showIcon description={t('documents.onlyOfficeHint')} />
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
        disabled={!isReady || isLoading}
        onClick={() => {
          void handleSave()
        }}
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
              if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => undefined)
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
            : getSplitPanelSurfaceStyle(token)),
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

        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          {isLoading ? <Spin fullscreen tip={t('documents.loadingEditor')} /> : null}
          <div id={EDITOR_PLACEHOLDER_ID} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}
