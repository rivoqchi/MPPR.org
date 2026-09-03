import { Alert, App, Button, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DocumentDocxEditorWorkspace,
  type DocumentDocxEditorHandle,
} from '@/features/documents/ui/DocumentDocxEditorWorkspace'
import {
  createDocument,
  saveDocumentDocxBytes,
} from '@/shared/api/documents-api'
import { resolveApiErrorMessage } from '@/shared/lib/api-error'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

const DEFAULT_TITLE = 'Yangi hujjat.docx'

export function DocumentNewPage() {
  const { notification } = App.useApp()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const editorRef = useRef<DocumentDocxEditorHandle>(null)
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [documentBytes, setDocumentBytes] = useState<Uint8Array | 'blank'>('blank')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpeningDocx, setIsOpeningDocx] = useState(false)

  const handleOpenDocx: UploadProps['customRequest'] = async (options) => {
    const file = options.file
    if (!(file instanceof File)) {
      options.onError?.(new Error('Invalid file'))
      return
    }

    setIsOpeningDocx(true)
    setErrorMessage(null)

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setDocumentBytes(new Uint8Array(bytes.buffer.slice(0)))
      setTitle(file.name.endsWith('.docx') ? file.name : `${file.name}.docx`)
      notification.success({
        message: t('documents.openDocxSuccess'),
        duration: 3,
      })
      options.onSuccess?.(bytes)
    } catch {
      notification.error({
        message: t('documents.openDocxError'),
        duration: 4,
      })
      options.onError?.(new Error('Open failed'))
    } finally {
      setIsOpeningDocx(false)
    }
  }

  const handleSave = async () => {
    const bytes = await editorRef.current?.save()
    if (!bytes?.length) {
      notification.warning({
        message: t('documents.emptyDocumentWarning'),
        duration: 3,
      })
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const document = await createDocument(title.trim() || DEFAULT_TITLE)
      await saveDocumentDocxBytes(document.id, bytes, title.trim() || DEFAULT_TITLE)

      notification.success({
        message: t('documents.docxEditorSaveSuccess'),
        duration: 3,
      })

      navigate('/files')
    } catch (error: unknown) {
      setErrorMessage(resolveApiErrorMessage(error, t, 'documents.createError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ ...fullHeightPageStyle, gap: 8 }}>
      {errorMessage ? <Alert type="error" message={errorMessage} showIcon /> : null}

      <div
        style={{
          padding: '0 0 4px',
          flexShrink: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Upload
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          showUploadList={false}
          customRequest={handleOpenDocx}
          disabled={isOpeningDocx || isSaving}
        >
          <Button icon={<UploadOutlined />} loading={isOpeningDocx}>
            {t('documents.openDocx')}
          </Button>
        </Upload>

        <Button type="primary" loading={isSaving} onClick={() => void handleSave()}>
          {t('documents.saveFile')}
        </Button>
      </div>

      <DocumentDocxEditorWorkspace
        key={
          documentBytes === 'blank'
            ? 'blank'
            : `local-${documentBytes.byteLength}-${title}`
        }
        ref={editorRef}
        documentBytes={documentBytes}
        title={title}
        onTitleChange={setTitle}
        isLoading={isOpeningDocx}
        onSave={handleSave}
      />
    </div>
  )
}
