import { Button, Modal, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface PprCalendarApproveModalProps {
  open: boolean
  monthLabel: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function PprCalendarApproveModal({
  open,
  monthLabel,
  isSubmitting,
  onClose,
  onConfirm,
}: PprCalendarApproveModalProps) {
  const { t } = useTranslation()
  const hint = t('pprCalendar.approveModal.hint')

  return (
    <Modal
      open={open}
      title={t('pprCalendar.approveModal.title')}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('pprCalendar.approveModal.no')}</Button>
          <Button type="primary" loading={isSubmitting} onClick={() => void onConfirm()}>
            {t('pprCalendar.approveModal.yes')}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={12}>
        <Text>
          {t('pprCalendar.approveModal.message', {
            monthLabel,
          })}
        </Text>
        {hint ? <Text type="secondary">{hint}</Text> : null}
      </Space>
    </Modal>
  )
}
