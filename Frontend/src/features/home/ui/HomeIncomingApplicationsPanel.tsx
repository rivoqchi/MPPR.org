import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { DashboardPriorityIncomingApplication } from '@/features/home/model/dashboard-types'
import { getApplicationStatusTagColor } from '@/features/application-submit/lib/application-status'

const { Text } = Typography

interface HomeIncomingApplicationsPanelProps {
  items: DashboardPriorityIncomingApplication[]
}

function formatUserName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || '—'
}

export function HomeIncomingApplicationsPanel({ items }: HomeIncomingApplicationsPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const todayItems = useMemo(
    () => items.filter((item) => dayjs(item.createdAt).isSame(dayjs(), 'day')),
    [items],
  )

  const columns: ColumnsType<DashboardPriorityIncomingApplication> = useMemo(
    () => [
      {
        title: t('applicationSubmit.fields.type'),
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (type: string) => t(`applicationSubmit.types.${type}`),
      },
      {
        title: t('applicationSubmit.fields.submittedBy'),
        key: 'author',
        render: (_, record) =>
          formatUserName(record.createdByFirstName, record.createdByLastName),
      },
      {
        title: t('applicationSubmit.fields.deadline'),
        dataIndex: 'deadline',
        key: 'deadline',
        width: 140,
        render: (deadline: string | undefined, record) => (
          <Text type={record.isOverdue ? 'danger' : undefined}>
            {deadline ? dayjs(deadline).format('DD.MM.YYYY') : '—'}
          </Text>
        ),
      },
      {
        title: t('homePage.tables.status'),
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (status: string) => (
          <Tag color={getApplicationStatusTagColor(status as 'in_progress')}>
            {t(`applicationSubmit.status.${status}`)}
          </Tag>
        ),
      },
      {
        title: t('homePage.actions.updatedAt'),
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      },
    ],
    [t],
  )

  return (
    <Card title={t('homePage.actions.incomingTitle')}>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={todayItems}
        pagination={false}
        locale={{ emptyText: t('homePage.actions.emptyIncoming') }}
        onRow={(record) => ({
          onClick: () => navigate(`/applications/incoming?applicationId=${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  )
}
