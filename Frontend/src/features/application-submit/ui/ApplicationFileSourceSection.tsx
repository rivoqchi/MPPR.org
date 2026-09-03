import { SettingOutlined, UploadOutlined } from '@ant-design/icons'
import { App, Button, Form, Radio, Select, Space, Switch, Typography, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApplicationDocumentEditorOverlay } from '@/features/application-submit/ui/ApplicationDocumentEditorOverlay'
import { ApplicationDocumentQrPlacementModal } from '@/features/application-submit/ui/ApplicationDocumentQrPlacementModal'
import { resolveOnlyOfficeLang } from '@/features/documents/lib/onlyoffice-lang'
import { getDocumentFileIcon } from '@/features/documents/lib/document-file-icon'
import {
  isDocxFileName,
  isOnlyOfficeEditableDocument,
  listDocuments,
  type DocumentAttachmentCopy,
  type UserDocumentSummary,
  type UserDocumentType,
} from '@/shared/api/documents-api'

export type ApplicationFileSource = 'myFiles' | 'archives' | 'other'

interface ApplicationFileSourceSectionProps {
  files: UploadFile[]
  onFilesChange: (files: UploadFile[]) => void
  applicationNumberPreview?: string
}

function documentToUploadFile(copy: DocumentAttachmentCopy): UploadFile {
  return {
    uid: copy.id,
    name: copy.name,
    size: copy.size,
    type: copy.mimeType,
    status: 'done',
  }
}

export function ApplicationFileSourceSection({
  files,
  onFilesChange,
  applicationNumberPreview,
}: ApplicationFileSourceSectionProps) {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const [fileSource, setFileSource] = useState<ApplicationFileSource>('other')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>()
  const [documents, setDocuments] = useState<UserDocumentSummary[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<UserDocumentSummary | null>(null)
  const [includeQr, setIncludeQr] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrDocument, setQrDocument] = useState<UserDocumentSummary | null>(null)

  const onlyOfficeLang = useMemo(
    () => resolveOnlyOfficeLang(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  )

  const documentType: UserDocumentType | null =
    fileSource === 'myFiles' ? 'FILE' : fileSource === 'archives' ? 'ARCHIVE' : null

  const loadDocuments = useCallback(async () => {
    if (!documentType) {
      return
    }

    setIsLoadingDocuments(true)

    try {
      const items = await listDocuments(documentType)
      setDocuments(items)
    } catch {
      setDocuments([])
    } finally {
      setIsLoadingDocuments(false)
    }
  }, [documentType])

  useEffect(() => {
    if (!documentType) {
      setSelectedDocumentId(undefined)
      return
    }

    void loadDocuments()
  }, [documentType, loadDocuments])

  useEffect(() => {
    setSelectedDocumentId(undefined)
    setIncludeQr(false)
    setQrModalOpen(false)
    setQrDocument(null)
  }, [fileSource])

  const fileSourceOptions = useMemo(
    () => [
      { value: 'myFiles', label: t('applicationSubmit.attachments.sources.myFiles') },
      { value: 'archives', label: t('applicationSubmit.attachments.sources.archives') },
      { value: 'other', label: t('applicationSubmit.attachments.sources.other') },
    ],
    [t],
  )

  const documentOptions = useMemo(
    () =>
      documents.map((document) => ({
        value: document.id,
        label: document.title,
        title: document.title,
      })),
    [documents],
  )

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  )

  const canConfigure = Boolean(
    selectedDocument &&
      isOnlyOfficeEditableDocument(selectedDocument.title, selectedDocument.mimeType),
  )

  const canUseQr = Boolean(selectedDocument && isDocxFileName(selectedDocument.title))

  const qrValue = useMemo(() => {
    const document = qrDocument ?? selectedDocument
    if (!document) {
      return ''
    }

    const parts = [
      `doc:${document.id}`,
      document.title,
      applicationNumberPreview ? `app:${applicationNumberPreview}` : null,
    ].filter(Boolean)

    return parts.join('|')
  }, [applicationNumberPreview, qrDocument, selectedDocument])

  const appendAttachment = useCallback(
    (attachment: DocumentAttachmentCopy) => {
      const nextFile = documentToUploadFile(attachment)
      const exists = files.some((file) => file.uid === nextFile.uid)

      if (exists) {
        onFilesChange(files.map((file) => (file.uid === nextFile.uid ? nextFile : file)))
      } else {
        onFilesChange([...files, nextFile])
      }
    },
    [files, onFilesChange],
  )

  const handleConfigure = useCallback(() => {
    if (!selectedDocument || !canConfigure) {
      return
    }

    setEditingDocument(selectedDocument)
    setEditorOpen(true)
  }, [canConfigure, selectedDocument])

  const handleIncludeQrChange = useCallback(
    (checked: boolean) => {
      setIncludeQr(checked)

      if (!checked) {
        setQrModalOpen(false)
        setQrDocument(null)
        return
      }

      if (!selectedDocument || !isDocxFileName(selectedDocument.title)) {
        message.warning(t('applicationSubmit.attachments.qrDocxOnly'))
        setIncludeQr(false)
        return
      }

      setQrDocument(selectedDocument)
      setQrModalOpen(true)
    },
    [message, selectedDocument, t],
  )

  const handleQrReady = useCallback(
    (attachment: DocumentAttachmentCopy) => {
      appendAttachment(attachment)
      setQrModalOpen(false)
      setIncludeQr(false)
      setQrDocument(null)
      message.success({
        content: t('applicationSubmit.attachments.qrCodedFileReady'),
        duration: 6,
      })
    },
    [appendAttachment, message, t],
  )

  const handleAttached = useCallback(
    (attachment: DocumentAttachmentCopy) => {
      appendAttachment(attachment)
      setEditorOpen(false)
      setEditingDocument(null)
    },
    [appendAttachment],
  )

  return (
    <>
      <Form.Item label={t('applicationSubmit.fields.files')}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            value={fileSource}
            options={fileSourceOptions}
            style={{ display: 'flex', width: '100%' }}
            onChange={(event) => setFileSource(event.target.value as ApplicationFileSource)}
          />

          {fileSource === 'other' ? (
            <Upload
              multiple
              beforeUpload={() => false}
              fileList={files}
              onChange={({ fileList }) =>
                onFilesChange(
                  fileList.map((file) => ({
                    ...file,
                    status: 'done' as const,
                  })),
                )
              }
            >
              <Button icon={<UploadOutlined />}>{t('applicationSubmit.uploadFiles')}</Button>
            </Upload>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Select
                  showSearch
                  allowClear
                  loading={isLoadingDocuments}
                  placeholder={t('applicationSubmit.attachments.selectDocument')}
                  style={{ flex: 1, minWidth: 200 }}
                  value={selectedDocumentId}
                  options={documentOptions}
                  optionRender={(option) => {
                    const document = documents.find((item) => item.id === option.value)
                    if (!document) {
                      return option.label
                    }

                    return (
                      <Space size={8}>
                        {getDocumentFileIcon(document.title, document.mimeType)}
                        <span>{document.title}</span>
                      </Space>
                    )
                  }}
                  filterOption={(input, option) =>
                    (option?.title ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={setSelectedDocumentId}
                />
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  disabled={!canConfigure}
                  onClick={handleConfigure}
                >
                  {t('applicationSubmit.attachments.configure')}
                </Button>
              </div>

              <Space size={8} align="center">
                <Typography.Text>{t('applicationSubmit.attachments.includeQr')}</Typography.Text>
                <Switch
                  checked={includeQr || qrModalOpen}
                  disabled={!canUseQr}
                  checkedChildren={t('common.yes')}
                  unCheckedChildren={t('common.no')}
                  onChange={handleIncludeQrChange}
                />
                {!canUseQr && selectedDocument ? (
                  <Typography.Text type="secondary">
                    {t('applicationSubmit.attachments.qrDocxOnly')}
                  </Typography.Text>
                ) : null}
              </Space>
            </Space>
          )}

          {fileSource !== 'other' && files.length > 0 ? (
            <Upload
              multiple
              beforeUpload={() => false}
              fileList={files}
              showUploadList={{ showRemoveIcon: true }}
              onChange={({ fileList }) =>
                onFilesChange(
                  fileList.map((file) => ({
                    ...file,
                    status: 'done' as const,
                  })),
                )
              }
            />
          ) : null}
        </Space>
      </Form.Item>

      <ApplicationDocumentEditorOverlay
        open={editorOpen}
        document={editingDocument}
        applicationNumberPreview={applicationNumberPreview}
        onClose={() => {
          setEditorOpen(false)
          setEditingDocument(null)
        }}
        onAttached={handleAttached}
      />

      <ApplicationDocumentQrPlacementModal
        open={qrModalOpen}
        document={qrDocument}
        qrText={qrValue}
        onlyOfficeLang={onlyOfficeLang}
        onClose={() => {
          setQrModalOpen(false)
          setIncludeQr(false)
          setQrDocument(null)
        }}
        onReady={handleQrReady}
      />
    </>
  )
}
