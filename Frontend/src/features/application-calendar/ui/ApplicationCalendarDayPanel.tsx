import { PaperClipOutlined } from '@ant-design/icons'
import { Button, Empty, Table, Tag, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Application, ApplicationAttachment } from '@/entities/application/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import { useUsersStore } from '@/entities/user/model/users-store'
import { getApplicationStatusDotColor } from '@/features/application-calendar/lib/calendar-applications'
import { CALENDAR_DAY_PANEL_MAX_HEIGHT } from '@/features/application-calendar/ui/ApplicationCalendarExpandPanel'
import { getApplicationStatusTagColor } from '@/features/application-submit/lib/application-status'

interface ApplicationCalendarDayPanelProps {
  applications: Application[]
  onClose: () => void
}

function getPrimaryAttachment(application: Application): ApplicationAttachment | null {
  return application.files[0] ?? application.images[0] ?? null
}

export function ApplicationCalendarDayPanel({
  applications,
  onClose,
}: ApplicationCalendarDayPanelProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)

  const columns = useMemo<ColumnsType<Application>>(
    () => [
      {
        key: 'dot',
        width: 28,
        render: (_, application) => (
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: getApplicationStatusDotColor(application.status),
              boxShadow: `0 0 0 1.5px ${getApplicationStatusDotColor(application.status)}33`,
            }}
          />
        ),
      },
      {
        title: t('applicationCalendar.dayPanel.columns.number'),
        key: 'number',
        width: 140,
        render: (_, application) => (
          <div>
            <div style={{ fontWeight: 700, color: token.colorText }}>
              {application.applicationNumber?.trim() || application.id.slice(0, 8)}
            </div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {dayjs(application.createdAt).format('DD MMM YYYY')}
            </div>
          </div>
        ),
      },
      {
        title: t('applicationCalendar.dayPanel.columns.type'),
        key: 'type',
        width: 120,
        render: (_, application) => t(`applicationSubmit.types.${application.type}`),
      },
      {
        title: t('applicationCalendar.dayPanel.columns.summary'),
        dataIndex: 'comment',
        key: 'summary',
        ellipsis: true,
        render: (comment: string) => comment || '—',
      },
      {
        title: t('applicationCalendar.dayPanel.columns.sender'),
        key: 'sender',
        width: 140,
        ellipsis: true,
        render: (_, application) => {
          if (application.createdByStructuralUnitId) {
            return (
              structuralUnits.find((unit) => unit.id === application.createdByStructuralUnitId)
                ?.shortName ?? application.createdByStructuralUnitId
            )
          }

          if (application.createdByFirstName || application.createdByLastName) {
            return getUserFullName({
              firstName: application.createdByFirstName ?? '',
              lastName: application.createdByLastName ?? '',
            })
          }

          const user = users.find((item) => item.id === application.createdByUserId)

          return user ? getUserFullName(user) : '—'
        },
      },
      {
        title: t('applicationCalendar.dayPanel.columns.executor'),
        key: 'executor',
        width: 150,
        ellipsis: true,
        render: (_, application) => {
          const recipients = (application.recipientUserIds ?? [])
            .map((userId) => {
              const user = users.find((item) => item.id === userId)

              return user ? getUserFullName(user) : null
            })
            .filter(Boolean)

          if (recipients.length > 0) {
            return recipients.join(', ')
          }

          return (
            application.structuralUnitIds
              .map(
                (unitId) =>
                  structuralUnits.find((unit) => unit.id === unitId)?.shortName ?? unitId,
              )
              .join(', ') || '—'
          )
        },
      },
      {
        title: t('applicationCalendar.dayPanel.columns.status'),
        key: 'status',
        width: 130,
        render: (_, application) => (
          <Tag color={getApplicationStatusTagColor(application.status)}>
            {t(`applicationSubmit.status.${application.status}`)}
          </Tag>
        ),
      },
      {
        title: t('applicationCalendar.dayPanel.columns.files'),
        key: 'files',
        width: 140,
        render: (_, application) => {
          const attachment = getPrimaryAttachment(application)
          const total = application.files.length + application.images.length

          if (!attachment) {
            return '—'
          }

          return (
            <Button
              size="small"
              icon={<PaperClipOutlined />}
              style={{ maxWidth: '100%' }}
              onClick={(event) => {
                event.stopPropagation()
                navigate(`/applications/submit?applicationId=${application.id}`)
                onClose()
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'bottom',
                }}
              >
                {attachment.name}
              </span>
              {total > 1 ? ` +${total - 1}` : ''}
            </Button>
          )
        },
      },
    ],
    [navigate, onClose, structuralUnits, t, token.colorText, token.colorTextSecondary, users],
  )

  const tableScrollY = Math.max(CALENDAR_DAY_PANEL_MAX_HEIGHT - 56, 160)

  if (applications.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('applicationCalendar.dayPanel.empty')} />
  }

  return (
    <Table<Application>
      size="small"
      rowKey="id"
      pagination={false}
      scroll={{ x: 860, y: tableScrollY }}
      dataSource={applications}
      columns={columns}
      style={{ margin: 0 }}
      styles={{
        header: {
          borderRadius: 0,
        },
      }}
      onRow={(application) => ({
        style: {
          cursor: 'pointer',
        },
        onClick: () => {
          navigate(`/applications/submit?applicationId=${application.id}`)
          onClose()
        },
      })}
    />
  )
}
