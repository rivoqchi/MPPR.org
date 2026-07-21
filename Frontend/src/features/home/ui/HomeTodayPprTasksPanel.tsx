import { Button, Card, List, Progress, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardTodayPprTask } from '@/features/home/model/dashboard-types'

const { Text } = Typography

interface HomeTodayPprTasksPanelProps {
  items: DashboardTodayPprTask[]
  canExecute: boolean
  onExecute: (task: DashboardTodayPprTask) => void
}

function getStatusColor(
  status: DashboardTodayPprTask['executionStatus'],
  isOverdue: boolean,
) {
  if (isOverdue) {
    return 'error'
  }

  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'processing'
    default:
      return 'default'
  }
}

export function HomeTodayPprTasksPanel({
  items,
  canExecute,
  onExecute,
}: HomeTodayPprTasksPanelProps) {
  const { t } = useTranslation()

  return (
    <Card title={t('homePage.actions.todayPprTitle')}>
      <List
        dataSource={items}
        locale={{ emptyText: t('homePage.actions.emptyTodayPpr') }}
        renderItem={(item) => {
          const buttonDisabled =
            !canExecute || !item.canExecute || item.completionPercent >= 100

          return (
            <List.Item
              actions={[
                <Button
                  key="execute"
                  type="primary"
                  danger={item.isOverdue}
                  disabled={buttonDisabled}
                  onClick={() => onExecute(item)}
                >
                  {t('homePage.actions.markPprDone')}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <Text strong type={item.isOverdue ? 'danger' : undefined}>
                      {item.pprTypeName}
                    </Text>
                    <Tag color={getStatusColor(item.executionStatus, item.isOverdue)}>
                      {t(`homePage.actions.status.${item.executionStatus}`)}
                    </Tag>
                    {item.isOverdue ? (
                      <Tag color="error">{t('homePage.actions.status.overdue')}</Tag>
                    ) : null}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Text type={item.isOverdue ? 'danger' : 'secondary'}>
                      {item.date} · {t('homePage.actions.objectsCount', { count: item.objectIds.length })}
                    </Text>
                    <Progress
                      percent={item.completionPercent}
                      size="small"
                      status={
                        item.isOverdue
                          ? 'exception'
                          : item.completionPercent >= 100
                            ? 'success'
                            : 'active'
                      }
                    />
                  </Space>
                }
              />
            </List.Item>
          )
        }}
      />
    </Card>
  )
}
