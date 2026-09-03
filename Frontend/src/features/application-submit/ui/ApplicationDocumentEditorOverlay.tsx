import {
  CloseOutlined,
  SaveOutlined,
  SnippetsOutlined,
} from '@ant-design/icons'
import { App, Button, Space, Spin, Switch, Typography, theme } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApplicationDocumentQrPlacementModal } from '@/features/application-submit/ui/ApplicationDocumentQrPlacementModal'
import { resolveOnlyOfficeLang } from '@/features/documents/lib/onlyoffice-lang'
import { useOnlyOfficeEditor } from '@/features/documents/lib/use-onlyoffice-editor'
import {
  copyDocumentForAttachment,
  getDocumentEditorConfig,
  getOnlyOfficeServerUrl,
  isDocxFileName,
  saveDocumentAsArchive,
  softPersistDocumentSave,
  type DocumentAttachmentCopy,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'

const EDITOR_PLACEHOLDER_ID = 'mppr-application-onlyoffice-editor'

interface ApplicationDocumentEditorOverlayProps {
  open: boolean
  document: UserDocumentSummary | null
  applicationNumberPreview?: string
  onClose: () => void
  onAttached: (attachment: DocumentAttachmentCopy) => void
}

export function ApplicationDocumentEditorOverlay({
  open,
  document,
  applicationNumberPreview,
  onClose,
  onAttached,
}: ApplicationDocumentEditorOverlayProps) {
  const { token } = theme.useToken()
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const [editorConfig, setEditorConfig] = useState<Record<string, unknown> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [includeQr, setIncludeQr] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const documentKeyRef = useRef<string>('')

  const onlyOfficeLang = useMemo(
    () => resolveOnlyOfficeLang(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  )

  const canUseQr = Boolean(document && isDocxFileName(document.title))

  const qrValue = useMemo(() => {
    if (!document) {
      return ''
    }

    const parts = [
      `doc:${document.id}`,
      document.title,
      applicationNumberPreview ? `app:${applicationNumberPreview}` : null,
    ].filter(Boolean)

    return parts.join('|')
  }, [applicationNumberPreview, document])

  const handleOnlyOfficeScriptError = useCallback(() => {
    setErrorMessage(t('documents.onlyOfficeUnavailable'))
  }, [t])

  const { triggerSave, isReady, getHasUnsavedChanges, markClean } = useOnlyOfficeEditor({
    placeholderId: EDITOR_PLACEHOLDER_ID,
    documentServerUrl: getOnlyOfficeServerUrl(),
    config: editorConfig,
    enabled: open && Boolean(editorConfig) && !qrModalOpen,
    onScriptError: handleOnlyOfficeScriptError,
  })

  useEffect(() => {
    if (!open || !document) {
      setEditorConfig(null)
      setErrorMessage(null)
      setIncludeQr(false)
      setQrModalOpen(false)
      documentKeyRef.current = ''
      return
    }

    let cancelled = false

    async function loadEditor() {
      setIsLoading(true)
      setErrorMessage(null)
      setEditorConfig(null)

      try {
        const config = await getDocumentEditorConfig(document.id, onlyOfficeLang)

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
  }, [document, onlyOfficeLang, open, t])

  useEffect(() => {
    if (!open || qrModalOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 150)

    return () => {
      window.clearTimeout(timer)
    }
  }, [open, qrModalOpen])

  const softPersist = useCallback(async () => {
    if (!document) {
      return false
    }

    const result = await softPersistDocumentSave(document.id, documentKeyRef.current, {
      hasUnsavedChanges: getHasUnsavedChanges(),
      triggerSave,
      timeoutMs: 4_000,
    })

    documentKeyRef.current = result.documentKey
    if (result.saved) {
      markClean()
    }

    return true
  }, [document, getHasUnsavedChanges, markClean, triggerSave])

  const attachDocumentCopy = useCallback(async () => {
    if (!document) {
      return
    }

    const attachment = await copyDocumentForAttachment(document.id)
    onAttached(attachment)
  }, [document, onAttached])

  const openQrPlacement = useCallback(async () => {
    if (!document || !canUseQr) {
      message.warning(t('applicationSubmit.attachments.qrDocxOnly'))
      setIncludeQr(false)
      return
    }

    setIsSaving(true)

    try {
      // Flush edits quickly in background; never block UI for 20s.
      await softPersist()
      setQrModalOpen(true)
    } finally {
      setIsSaving(false)
    }
  }, [canUseQr, document, message, softPersist, t])

  const handleIncludeQrChange = useCallback(
    (checked: boolean) => {
      setIncludeQr(checked)

      if (checked) {
        void openQrPlacement()
      } else {
        setQrModalOpen(false)
      }
    },
    [openQrPlacement],
  )

  const handleSave = useCallback(async () => {
    if (!isReady || !document) {
      return
    }

    if (includeQr) {
      await openQrPlacement()
      return
    }

    setIsSaving(true)

    try {
      await softPersist()
      message.success(t('documents.saveRequested'))
    } finally {
      setIsSaving(false)
    }
  }, [document, includeQr, isReady, message, openQrPlacement, softPersist, t])

  const handleFinishAndAttach = useCallback(async () => {
    if (!isReady || !document) {
      return
    }

    if (canUseQr && includeQr) {
      await openQrPlacement()
      return
    }

    setIsAttaching(true)

    try {
      await softPersist()
      await attachDocumentCopy()
      message.success(t('applicationSubmit.attachments.attachedSuccess'))
      onClose()
    } catch {
      message.error(t('applicationSubmit.attachments.attachError'))
    } finally {
      setIsAttaching(false)
    }
  }, [
    attachDocumentCopy,
    canUseQr,
    document,
    includeQr,
    isReady,
    message,
    onClose,
    openQrPlacement,
    softPersist,
    t,
  ])

  const handleSaveAsArchive = useCallback(async () => {
    if (!document) {
      return
    }

    try {
      await softPersist()
      await saveDocumentAsArchive(document.id)
      message.success(t('applicationSubmit.attachments.archiveSaved'))
    } catch {
      message.error(t('applicationSubmit.attachments.archiveSaveError'))
    }
  }, [document, message, softPersist, t])

  const handleQrReady = useCallback(
    (attachment: DocumentAttachmentCopy) => {
      documentKeyRef.current = ''
      setIncludeQr(false)
      setQrModalOpen(false)
      onAttached(attachment)
      message.success({
        content: t('applicationSubmit.attachments.qrCodedFileReady'),
        duration: 6,
      })
      onClose()
    },
    [message, onAttached, onClose, t],
  )

  if (!open) {
    return null
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          background: token.colorBgContainer,
        }}
      >
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
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {document?.title ?? t('documents.editorTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('applicationSubmit.attachments.editorHint')}
            </Typography.Text>
          </div>

          <Space wrap>
            <Space size={8}>
              <Typography.Text>{t('applicationSubmit.attachments.includeQr')}</Typography.Text>
              <Switch
                checked={includeQr || qrModalOpen}
                disabled={!canUseQr || isSaving}
                checkedChildren={t('common.yes')}
                unCheckedChildren={t('common.no')}
                onChange={handleIncludeQrChange}
              />
            </Space>
            <Button
              icon={<SaveOutlined />}
              loading={isSaving}
              disabled={!isReady || isLoading}
              onClick={() => void handleSave()}
            >
              {t('applicationSubmit.attachments.save')}
            </Button>
            <Button icon={<SnippetsOutlined />} onClick={() => void handleSaveAsArchive()}>
              {t('applicationSubmit.attachments.saveAsArchive')}
            </Button>
            <Button
              type="primary"
              loading={isAttaching || isSaving}
              disabled={!isReady || isLoading}
              onClick={() => void handleFinishAndAttach()}
            >
              {t('applicationSubmit.attachments.finishAndAttach')}
            </Button>
            <Button icon={<CloseOutlined />} onClick={onClose}>
              {t('common.close')}
            </Button>
          </Space>
        </div>

        {errorMessage ? (
          <div style={{ padding: 24 }}>
            <Typography.Text type="danger">{errorMessage}</Typography.Text>
          </div>
        ) : (
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            {isLoading ? <Spin fullscreen tip={t('documents.loadingEditor')} /> : null}
            <div id={EDITOR_PLACEHOLDER_ID} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>

      <ApplicationDocumentQrPlacementModal
        open={qrModalOpen}
        document={document}
        qrText={qrValue}
        onlyOfficeLang={onlyOfficeLang}
        onClose={() => {
          setQrModalOpen(false)
          setIncludeQr(false)
        }}
        onReady={handleQrReady}
      />
    </>
  )
}
