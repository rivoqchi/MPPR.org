import { Button, Modal, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface PprCalendarClearModalProps {
  open: boolean
  monthLabel: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function PprCalendarClearModal({
  open,
  monthLabel,
  isSubmitting,
  onClose,
  onConfirm,
}: PprCalendarClearModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      title={t('pprCalendar.clearModal.title')}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('pprCalendar.clearModal.no')}</Button>
          <Button danger type="primary" loading={isSubmitting} onClick={() => void onConfirm()}>
            {t('pprCalendar.clearModal.yes')}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={12}>
        <Text>
          {t('pprCalendar.clearModal.message', {
            monthLabel,
          })}
        </Text>
        <Text type="secondary">{t('pprCalendar.clearModal.hint')}</Text>
      </Space>
    </Modal>
  )
}
