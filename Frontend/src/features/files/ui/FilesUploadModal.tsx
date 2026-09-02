import { PlusOutlined } from '@ant-design/icons'
import { App, Button, Checkbox, Input, Modal, Space, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadDocument, type UserDocumentType } from '@/shared/api/documents-api'

interface FilesUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  documentType?: UserDocumentType
}

export function FilesUploadModal({
  open,
  onClose,
  onSuccess,
  documentType = 'FILE',
}: FilesUploadModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [title, setTitle] = useState('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [isServiceFile, setIsServiceFile] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setFileList([])
      setIsServiceFile(false)
      setIsSubmitting(false)
    }
  }, [open])

  const selectedFile = fileList[0]?.originFileObj

  const handleSubmit = async () => {
    if (!selectedFile) {
      message.warning(t('files.upload.fileRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      await uploadDocument(
        selectedFile,
        title || selectedFile.name,
        documentType,
        documentType === 'FILE' && isServiceFile,
      )
      message.success(t('files.upload.success'))
      onSuccess()
      onClose()
    } catch {
      message.error(t('files.upload.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('files.upload.title')}
      okText={t('files.upload.submit')}
      cancelText={t('common.cancel')}
      confirmLoading={isSubmitting}
      onCancel={onClose}
      onOk={() => {
        void handleSubmit()
      }}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
        <div>
          <div style={{ marginBottom: 8 }}>{t('files.upload.nameLabel')}</div>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('files.upload.namePlaceholder')}
            maxLength={255}
          />
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>{t('files.upload.fileLabel')}</div>
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            fileList={fileList}
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.odt,.ods,.odp,.rtf,.txt,.csv"
            onChange={({ fileList: nextFileList }) => {
              setFileList(nextFileList.slice(-1))

              const nextFile = nextFileList[0]?.originFileObj
              if (nextFile && !title.trim()) {
                setTitle(nextFile.name)
              }
            }}
          >
            <Button icon={<PlusOutlined />}>{t('files.upload.chooseFile')}</Button>
          </Upload>
        </div>

        {documentType === 'FILE' ? (
          <Checkbox
            checked={isServiceFile}
            onChange={(event) => setIsServiceFile(event.target.checked)}
          >
            {t('files.upload.serviceFileLabel')}
          </Checkbox>
        ) : null}
      </Space>
    </Modal>
  )
}
