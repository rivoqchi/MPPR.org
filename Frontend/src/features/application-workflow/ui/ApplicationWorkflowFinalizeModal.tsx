import { Button, Modal, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

type FinalizeAction = 'confirm' | 'cancel'

interface ApplicationWorkflowFinalizeModalProps {
  open: boolean
  action: FinalizeAction
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function ApplicationWorkflowFinalizeModal({
  open,
  action,
  isSubmitting,
  onClose,
  onConfirm,
}: ApplicationWorkflowFinalizeModalProps) {
  const { t } = useTranslation()
  const isConfirm = action === 'confirm'

  return (
    <Modal
      open={open}
      title={t(`applicationWorkflow.finalizeModal.${action}.title`)}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('applicationWorkflow.finalizeModal.no')}</Button>
          <Button
            type="primary"
            danger={!isConfirm}
            loading={isSubmitting}
            onClick={() => void onConfirm()}
          >
            {t(`applicationWorkflow.finalizeModal.${action}.yes`)}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={12}>
        <Text>{t(`applicationWorkflow.finalizeModal.${action}.message`)}</Text>
        <Text type="secondary">{t(`applicationWorkflow.finalizeModal.${action}.hint`)}</Text>
      </Space>
    </Modal>
  )
}
