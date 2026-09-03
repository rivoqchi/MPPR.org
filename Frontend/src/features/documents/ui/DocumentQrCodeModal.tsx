import { QrcodeOutlined } from '@ant-design/icons'
import { App, Form, Input, Modal } from 'antd'
import QRCode from 'qrcode'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  dataUrlToFile,
  uploadDocumentImage,
} from '@/features/documents/lib/document-image-upload'

interface DocumentQrCodeModalProps {
  open: boolean
  onClose: () => void
  onInsert: (attrs: {
    src: string
    storageKey: string
    width: number
    height: number
    alt: string
    dataQr: string
  }) => void
}

export function DocumentQrCodeModal({ open, onClose, onInsert }: DocumentQrCodeModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [form] = Form.useForm<{ text: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const text = values.text.trim()

    if (!text) {
      return
    }

    setIsSubmitting(true)

    try {
      const dataUrl = await QRCode.toDataURL(text, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
      })

      const file = dataUrlToFile(dataUrl, `qr-${Date.now()}.png`)
      if (!file) {
        throw new Error('QR generation failed')
      }

      const uploaded = await uploadDocumentImage(file)

      onInsert({
        src: uploaded.src,
        storageKey: uploaded.storageKey,
        width: 160,
        height: 160,
        alt: 'QR Code',
        dataQr: text,
      })

      form.resetFields()
      onClose()
      message.success(t('documents.qr.insertSuccess'))
    } catch {
      message.error(t('documents.qr.insertError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={
        <span>
          <QrcodeOutlined style={{ marginRight: 8 }} />
          {t('documents.qr.title')}
        </span>
      }
      okText={t('documents.qr.insert')}
      cancelText={t('common.cancel')}
      confirmLoading={isSubmitting}
      onCancel={onClose}
      onOk={() => void handleSubmit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="text"
          label={t('documents.qr.textLabel')}
          rules={[{ required: true, message: t('documents.qr.textRequired') }]}
        >
          <Input.TextArea rows={4} placeholder={t('documents.qr.textPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
