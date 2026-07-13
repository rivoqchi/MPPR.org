import { App, Button, Empty, List, Modal, Popconfirm, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PprCalendarMonth } from '@/entities/ppr-calendar/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { getUserFullName } from '@/entities/user/lib/user-display'

const { Text } = Typography

interface PprCalendarIncomingApprovalsModalProps {
  open: boolean
  months: PprCalendarMonth[]
  isLoading: boolean
  onClose: () => void
  onReview: (month: PprCalendarMonth) => void
  onReject: (monthId: string) => Promise<void>
}

export function PprCalendarIncomingApprovalsModal({
  open,
  months,
  isLoading,
  onClose,
  onReview,
  onReject,
}: PprCalendarIncomingApprovalsModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)

  const getScopeLabel = (month: PprCalendarMonth) => {
    const structuralUnit = structuralUnits.find((item) => item.id === month.structuralUnitId)

    if (!month.sectionId) {
      return t('pprCalendar.scope.structure')
    }

    const section = structuralUnit?.sections.find((item) => item.id === month.sectionId)

    return section?.shortName ?? month.sectionId
  }

  const getMonthLabel = (month: PprCalendarMonth) =>
    t(`pprCalendar.months.${month.month - 1}`) + ` ${month.year}`

  const getSubmitterName = (userId?: string) => {
    if (!userId) {
      return '—'
    }

    const user = users.find((item) => item.id === userId)

    return user ? getUserFullName(user) : '—'
  }

  const handleReject = async (monthId: string) => {
    try {
      await onReject(monthId)
      message.success(t('pprCalendar.messages.rejectSuccess'))
    } catch {
      message.error(t('pprCalendar.messages.rejectError'))
    }
  }

  const handleReview = (month: PprCalendarMonth) => {
    onReview(month)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('pprCalendar.incomingApprovalsModal.title')}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      {isLoading ? (
        <Text type="secondary">{t('common.loading')}</Text>
      ) : months.length === 0 ? (
        <Empty description={t('pprCalendar.incomingApprovalsModal.empty')} />
      ) : (
        <List
          dataSource={months}
          renderItem={(month) => (
            <List.Item
              actions={[
                <Button key="review" type="primary" onClick={() => handleReview(month)}>
                  {t('pprCalendar.actions.review')}
                </Button>,
                <Popconfirm
                  key="reject"
                  title={t('pprCalendar.incomingApprovalsModal.rejectConfirm')}
                  onConfirm={() => void handleReject(month.id)}
                >
                  <Button danger>{t('pprCalendar.actions.reject')}</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <span>{getMonthLabel(month)}</span>
                    <Tag color="processing">{t('pprCalendar.status.pending_approval')}</Tag>
                    <Tag>{getScopeLabel(month)}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">
                      {t('pprCalendar.incomingApprovalsModal.submitter', {
                        name: getSubmitterName(month.submittedByUserId),
                      })}
                    </Text>
                    <Text type="secondary">
                      {t('pprCalendar.incomingApprovalsModal.entries', { count: month.entries.length })}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
