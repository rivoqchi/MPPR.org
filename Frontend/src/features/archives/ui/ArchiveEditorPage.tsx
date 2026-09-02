import {
  ArrowLeftOutlined,
  CompressOutlined,
  ExpandOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { Alert, Button, Space, Spin, message, theme, Tooltip, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { resolveOnlyOfficeLang } from '@/features/documents/lib/onlyoffice-lang'
import { useElementFullscreen } from '@/features/documents/lib/use-element-fullscreen'
import { useOnlyOfficeEditor } from '@/features/documents/lib/use-onlyoffice-editor'
import { getDocumentEditorConfig, getOnlyOfficeServerUrl } from '@/shared/api/documents-api'
import {
  fullHeightPageStyle,
  getSplitPanelSurfaceStyle,
  pageToolbarActionStyle,
  pageToolbarStyle,
} from '@/shared/lib/page-layout'

const EDITOR_PLACEHOLDER_ID = 'mppr-archive-onlyoffice-editor'

export function ArchiveEditorPage() {
  const { token } = theme.useToken()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { documentId } = useParams<{ documentId: string }>()
  const [editorConfig, setEditorConfig] = useState<Record<string, unknown> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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

  const handleSave = useCallback(() => {
    if (!isReady) {
      return
    }

    setIsSaving(true)
    triggerSave()
    message.success(t('documents.saveRequested'))

    window.setTimeout(() => {
      setIsSaving(false)
    }, 1500)
  }, [isReady, t, triggerSave])

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

  if (errorMessage) {
    return (
      <div style={fullHeightPageStyle}>
        <Alert type="error" message={errorMessage} showIcon description={t('documents.onlyOfficeHint')} />
      </div>
    )
  }

  const editorActions = (
    <Space wrap style={pageToolbarActionStyle}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/archives')}>
        {t('archives.backToList')}
      </Button>

      <Button
        type="default"
        icon={<SaveOutlined />}
        loading={isSaving}
        disabled={!isReady || isLoading}
        onClick={handleSave}
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
              {t('archives.editorTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('archives.editorHint')}</Typography.Text>
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
              {t('archives.editorTitle')}
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
