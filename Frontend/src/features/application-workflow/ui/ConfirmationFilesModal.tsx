import { UploadOutlined } from '@ant-design/icons'
import { App, Button, Modal, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicationAttachment } from '@/entities/application/model/types'
import {
  toApplicationAttachments,
  toUploadFiles,
} from '@/features/application-submit/lib/attachment-utils'

interface ConfirmationFilesModalProps {
  open: boolean
  existingFiles?: ApplicationAttachment[]
  onCancel: () => void
  onConfirm: (files: ApplicationAttachment[]) => void
}

export function ConfirmationFilesModal({
  open,
  existingFiles = [],
  onCancel,
  onConfirm,
}: ConfirmationFilesModalProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFileList(toUploadFiles(existingFiles))
    }
  }, [existingFiles, open])

  const handleConfirm = async () => {
    if (fileList.length === 0) {
      notification.error({
        message: t('applicationWorkflow.confirmationFiles.required'),
      })
      return
    }

    setSubmitting(true)

    try {
      const attachments = await toApplicationAttachments(fileList, existingFiles, 'file')
      onConfirm(attachments)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('applicationWorkflow.confirmationFiles.title')}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="confirm" type="primary" loading={submitting} onClick={() => void handleConfirm()}>
          {t('applicationWorkflow.confirmationFiles.confirm')}
        </Button>,
      ]}
      destroyOnHidden
      width={560}
    >
      <p style={{ marginBottom: 16 }}>{t('applicationWorkflow.confirmationFiles.hint')}</p>
      <Upload
        multiple
        beforeUpload={() => false}
        fileList={fileList}
        onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
      >
        <Button icon={<UploadOutlined />}>{t('applicationWorkflow.confirmationFiles.upload')}</Button>
      </Upload>
    </Modal>
  )
}
