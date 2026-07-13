import { BellOutlined } from '@ant-design/icons'
import { Badge, Card, List, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { HOME_PAGE_GAP } from '@/features/home/lib/home-page-layout'
import { getApplicationStatusTagColor } from '@/features/application-submit/lib/application-status'
import type {
  DashboardRecentApplication,
  DashboardRecentNotification,
  DashboardUpcomingDeadline,
} from '@/features/home/model/dashboard-types'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'

const { Text, Paragraph } = Typography

interface DashboardActivityPanelsProps {
  recentApplications: DashboardRecentApplication[]
  upcomingDeadlines: DashboardUpcomingDeadline[]
  recentNotifications: DashboardRecentNotification[]
}

function formatUserName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || '—'
}

export function DashboardActivityPanels({
  recentApplications,
  upcomingDeadlines,
  recentNotifications,
}: DashboardActivityPanelsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canView } = useRolePermissions()

  const canViewApplications =
    canView('/applications/submit') || canView('/applications/incoming')

  const deadlineColumns: ColumnsType<DashboardUpcomingDeadline> = useMemo(
    () => [
      {
        title: t('applicationSubmit.fields.deadline'),
        dataIndex: 'deadline',
        key: 'deadline',
        width: 120,
        render: (deadline: string | undefined, record) => (
          <Text type={record.isOverdue ? 'danger' : undefined}>
            {deadline ? dayjs(deadline).format('DD.MM.YYYY') : '—'}
          </Text>
        ),
      },
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
        title: t('homePage.tables.daysRemaining'),
        key: 'daysRemaining',
        width: 120,
        render: (_, record) => {
          if (record.daysRemaining === null) {
            return '—'
          }

          if (record.isOverdue) {
            return <Tag color="error">{t('homePage.tables.overdue')}</Tag>
          }

          return (
            <Tag color={record.daysRemaining <= 3 ? 'warning' : 'processing'}>
              {t('homePage.tables.daysLeft', { count: record.daysRemaining })}
            </Tag>
          )
        },
      },
    ],
    [t],
  )

  const applicationColumns: ColumnsType<DashboardRecentApplication> = useMemo(
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
        width: 120,
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
        width: 140,
        render: (status: string) => (
          <Tag color={getApplicationStatusTagColor(status as 'in_progress')}>
            {t(`applicationSubmit.status.${status}`)}
          </Tag>
        ),
      },
      {
        title: t('homePage.tables.updatedAt'),
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 140,
        render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      },
    ],
    [t],
  )

  const openApplication = (applicationId: string) => {
    navigate(`/applications/incoming?applicationId=${applicationId}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HOME_PAGE_GAP }}>
      {canViewApplications && (
        <>
          <Card title={t('homePage.tables.upcomingDeadlines')}>
            <Table
              rowKey="id"
              size="small"
              columns={deadlineColumns}
              dataSource={upcomingDeadlines}
              pagination={false}
              locale={{ emptyText: t('homePage.tables.emptyDeadlines') }}
              onRow={(record) => ({
                onClick: () => openApplication(record.id),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>

          <Card title={t('homePage.tables.recentApplications')}>
            <Table
              rowKey="id"
              size="small"
              columns={applicationColumns}
              dataSource={recentApplications}
              pagination={false}
              locale={{ emptyText: t('homePage.tables.emptyApplications') }}
              onRow={(record) => ({
                onClick: () => openApplication(record.id),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </>
      )}

      <Card title={t('homePage.tables.recentNotifications')}>
        <List
          dataSource={recentNotifications}
          locale={{ emptyText: t('homePage.tables.emptyNotifications') }}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: item.linkPath ? 'pointer' : 'default' }}
              onClick={() => {
                if (item.linkPath) {
                  navigate(item.linkPath)
                }
              }}
            >
              <List.Item.Meta
                avatar={
                  <Badge dot={!item.read}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(22, 119, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1677ff',
                      }}
                    >
                      <BellOutlined />
                    </div>
                  </Badge>
                }
                title={
                  <Text strong={!item.read} style={{ marginRight: 8 }}>
                    {item.title}
                  </Text>
                }
                description={
                  <>
                    <Paragraph
                      type="secondary"
                      style={{ marginBottom: 4 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {item.message}
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
