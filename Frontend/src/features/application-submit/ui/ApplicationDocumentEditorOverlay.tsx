import {
  CloseOutlined,
  QrcodeOutlined,
  SaveOutlined,
  SnippetsOutlined,
} from '@ant-design/icons'
import { App, Button, Space, Typography, theme } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DocumentDocxEditorWorkspace,
  type DocumentDocxEditorHandle,
} from '@/features/documents/ui/DocumentDocxEditorWorkspace'
import {
  copyDocumentForAttachment,
  fetchDocumentPreviewBlob,
  insertQrIntoDocument,
  isDocxFileName,
  saveDocumentAsArchive,
  saveDocumentDocxBytes,
  type DocumentAttachmentCopy,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'

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
  const { t } = useTranslation()
  const { modal, message } = App.useApp()
  const editorRef = useRef<DocumentDocxEditorHandle>(null)
  const [documentBytes, setDocumentBytes] = useState<Uint8Array | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [isCreatingQr, setIsCreatingQr] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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

  useEffect(() => {
    if (!open || !document) {
      setDocumentBytes(undefined)
      setErrorMessage(null)
      return
    }

    if (!isDocxFileName(document.title)) {
      setErrorMessage(t('documents.previewUnsupported'))
      return
    }

    let cancelled = false

    async function loadDocument() {
      const activeDocument = document
      if (!activeDocument) {
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      setDocumentBytes(undefined)

      try {
        const blob = await fetchDocumentPreviewBlob(activeDocument.id)
        if (cancelled) {
          return
        }

        setDocumentBytes(new Uint8Array(await blob.arrayBuffer()))
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

    void loadDocument()

    return () => {
      cancelled = true
    }
  }, [document, open, refreshKey, t])

  const persistDocument = useCallback(async (): Promise<boolean> => {
    if (!document) {
      return false
    }

    const bytes = await editorRef.current?.save()
    if (!bytes?.length) {
      return false
    }

    await saveDocumentDocxBytes(document.id, bytes, document.title)
    return true
  }, [document])

  const handleSave = useCallback(async () => {
    if (!document || !documentBytes) {
      return
    }

    setIsSaving(true)

    try {
      const saved = await persistDocument()
      if (saved) {
        message.success(t('documents.docxEditorSaveSuccess'))
      } else {
        message.warning(t('applicationSubmit.attachments.savePending'))
      }
    } finally {
      setIsSaving(false)
    }
  }, [document, documentBytes, message, persistDocument, t])

  const attachDocumentCopy = useCallback(async () => {
    if (!document) {
      return
    }

    setIsAttaching(true)

    try {
      await persistDocument()
      const attachment = await copyDocumentForAttachment(document.id)
      onAttached(attachment)
      message.success(t('applicationSubmit.attachments.attachedSuccess'))
      onClose()
    } catch {
      message.error(t('applicationSubmit.attachments.attachError'))
    } finally {
      setIsAttaching(false)
    }
  }, [document, message, onAttached, onClose, persistDocument, t])

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
    if (!document || !qrValue) {
      message.warning(t('applicationSubmit.attachments.qrNotReady'))
      return
    }

    setIsCreatingQr(true)

    try {
      await persistDocument()
      await insertQrIntoDocument(document.id, qrValue)
      setRefreshKey((value) => value + 1)
      message.success(t('applicationSubmit.attachments.qrInsertedHint'))
    } catch {
      message.error(t('applicationSubmit.attachments.qrInsertError'))
    } finally {
      setIsCreatingQr(false)
    }
  }, [document, message, persistDocument, qrValue, t])

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
            disabled={!documentBytes || isLoading}
            onClick={() => void handleCreateQr()}
          >
            {t('applicationSubmit.attachments.createQr')}
          </Button>
          <Button
            icon={<SaveOutlined />}
            loading={isSaving}
            disabled={!documentBytes || isLoading}
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
            disabled={!documentBytes || isLoading}
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
        <DocumentDocxEditorWorkspace
          key={`${document?.id ?? 'none'}-${refreshKey}`}
          ref={editorRef}
          documentBytes={documentBytes}
          title={document?.title ?? ''}
          isLoading={isLoading}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
