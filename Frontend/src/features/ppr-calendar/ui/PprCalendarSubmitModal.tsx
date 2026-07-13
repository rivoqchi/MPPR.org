import { Button, Modal, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface PprCalendarSubmitModalProps {
  open: boolean
  headFullName: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function PprCalendarSubmitModal({
  open,
  headFullName,
  isSubmitting,
  onClose,
  onConfirm,
}: PprCalendarSubmitModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      title={t('pprCalendar.submitModal.title')}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('pprCalendar.submitModal.no')}</Button>
          <Button type="primary" loading={isSubmitting} onClick={() => void onConfirm()}>
            {t('pprCalendar.submitModal.yes')}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={12}>
        <Text>
          {t('pprCalendar.submitModal.message', {
            headName: headFullName,
          })}
        </Text>
        <Text type="secondary">{t('pprCalendar.submitModal.hint')}</Text>
      </Space>
    </Modal>
  )
}
