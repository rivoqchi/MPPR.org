import {
  CloseOutlined,
  QrcodeOutlined,
  SaveOutlined,
  SnippetsOutlined,
} from '@ant-design/icons'
import { App, Button, Space, Spin, Typography, theme } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveOnlyOfficeLang } from '@/features/documents/lib/onlyoffice-lang'
import { useOnlyOfficeEditor } from '@/features/documents/lib/use-onlyoffice-editor'
import {
  copyDocumentForAttachment,
  getDocumentEditorConfig,
  getDocumentSaveState,
  getOnlyOfficeServerUrl,
  insertQrIntoDocument,
  saveDocumentAsArchive,
  waitForDocumentSave,
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
  const { modal, message } = App.useApp()
  const [editorConfig, setEditorConfig] = useState<Record<string, unknown> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [isCreatingQr, setIsCreatingQr] = useState(false)
  const documentKeyRef = useRef<string>('')

  const onlyOfficeLang = useMemo(
    () => resolveOnlyOfficeLang(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  )

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

  const { triggerSave, isReady, isDocumentReady } = useOnlyOfficeEditor({
    placeholderId: EDITOR_PLACEHOLDER_ID,
    documentServerUrl: getOnlyOfficeServerUrl(),
    config: editorConfig,
    enabled: open && Boolean(editorConfig),
    onScriptError: handleOnlyOfficeScriptError,
  })

  useEffect(() => {
    if (!open || !document) {
      setEditorConfig(null)
      setErrorMessage(null)
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
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 150)

    return () => {
      window.clearTimeout(timer)
    }
  }, [open])

  const persistDocument = useCallback(async (): Promise<boolean> => {
    if (!document) {
      return false
    }

    const previousKey = documentKeyRef.current
    triggerSave()

    const saved = await waitForDocumentSave(document.id, previousKey)

    if (saved) {
      const state = await getDocumentSaveState(document.id)
      documentKeyRef.current = state.documentKey
    }

    return saved
  }, [document, triggerSave])

  const handleSave = useCallback(async () => {
    if (!isReady || !document) {
      return
    }

    setIsSaving(true)

    try {
      const saved = await persistDocument()
      if (saved) {
        message.success(t('documents.saveRequested'))
      } else {
        message.warning(t('applicationSubmit.attachments.savePending'))
      }
    } finally {
      setIsSaving(false)
    }
  }, [document, isReady, message, persistDocument, t])

  const attachDocumentCopy = useCallback(async () => {
    if (!document) {
      return
    }

    setIsAttaching(true)

    try {
      const previousKey = documentKeyRef.current
      triggerSave()
      await waitForDocumentSave(document.id, previousKey, 3_000, 200)

      const attachment = await copyDocumentForAttachment(document.id)
      onAttached(attachment)
      message.success(t('applicationSubmit.attachments.attachedSuccess'))
      onClose()
    } catch {
      message.error(t('applicationSubmit.attachments.attachError'))
    } finally {
      setIsAttaching(false)
    }
  }, [document, message, onAttached, onClose, t, triggerSave])

  const confirmSaveAndAttach = useCallback(() => {
    modal.confirm({
      title: t('applicationSubmit.attachments.confirmSaveTitle'),
      content: t('applicationSubmit.attachments.confirmSaveMessage'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      onOk: async () => {
        setIsAttaching(true)

        try {
          await persistDocument()
          await attachDocumentCopy()
        } finally {
          setIsAttaching(false)
        }
      },
    })
  }, [attachDocumentCopy, modal, persistDocument, t])

  const handleSaveAsArchive = useCallback(async () => {
    if (!document) {
      return
    }

    try {
      await persistDocument()
      await saveDocumentAsArchive(document.id)
      message.success(t('applicationSubmit.attachments.archiveSaved'))
    } catch {
      message.error(t('applicationSubmit.attachments.archiveSaveError'))
    }
  }, [document, message, persistDocument, t])

  const handleCreateQr = useCallback(async () => {
    if (!document || !isDocumentReady || !qrValue) {
      message.warning(t('applicationSubmit.attachments.qrNotReady'))
      return
    }

    setIsCreatingQr(true)

    try {
      const previousKey = documentKeyRef.current
      triggerSave()
      await waitForDocumentSave(document.id, previousKey, 1_500, 200)

      setEditorConfig(null)

      const result = await insertQrIntoDocument(document.id, qrValue, onlyOfficeLang)
      documentKeyRef.current = result.documentKey
      setEditorConfig(result.editorConfig as Record<string, unknown>)
      message.success(t('applicationSubmit.attachments.qrInsertedHint'))
    } catch {
      message.error(t('applicationSubmit.attachments.qrInsertError'))
    } finally {
      setIsCreatingQr(false)
    }
  }, [document, isDocumentReady, message, onlyOfficeLang, qrValue, t, triggerSave])

  if (!open) {
    return null
  }

  return (
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
          <Button
            icon={<QrcodeOutlined />}
            loading={isCreatingQr}
            disabled={!isDocumentReady}
            onClick={() => void handleCreateQr()}
          >
            {t('applicationSubmit.attachments.createQr')}
          </Button>
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
            loading={isAttaching}
            disabled={!isReady || isLoading}
            onClick={confirmSaveAndAttach}
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
  )
}
