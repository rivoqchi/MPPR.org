import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { Card, Col, Row, Statistic, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { HOME_PAGE_GAP } from '@/features/home/lib/home-page-layout'
import type { DashboardSummary } from '@/features/home/model/dashboard-types'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'

interface DashboardKpiCardsProps {
  summary: DashboardSummary
}

export function DashboardKpiCards({ summary }: DashboardKpiCardsProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { canView } = useRolePermissions()
  const { applications, ppr } = summary.kpis

  const canViewApplications =
    canView('/applications/submit') || canView('/applications/incoming')
  const canViewPpr = canView('/ppr-calendar') || canView('/management/ppr')

  const cards = [
    ...(canViewApplications
      ? [
          {
            key: 'applications-total',
            title: t('homePage.kpis.applicationsTotal'),
            value: applications.total,
            icon: <FileTextOutlined />,
            color: token.colorPrimary,
            link: '/applications/submit',
          },
          {
            key: 'applications-in-progress',
            title: t('homePage.kpis.applicationsInProgress'),
            value: applications.inProgress,
            icon: <ClockCircleOutlined />,
            color: token.colorInfo,
            link: '/applications/incoming',
          },
          {
            key: 'applications-overdue',
            title: t('homePage.kpis.applicationsOverdue'),
            value: applications.overdue,
            icon: <ExclamationCircleOutlined />,
            color: applications.overdue > 0 ? token.colorError : token.colorTextSecondary,
            link: '/applications/incoming',
          },
          {
            key: 'applications-incoming',
            title: t('homePage.kpis.applicationsIncoming'),
            value: applications.incoming,
            icon: <InboxOutlined />,
            color: token.colorWarning,
            link: '/applications/incoming',
          },
        ]
      : []),
    ...(canViewPpr
      ? [
          {
            key: 'ppr-execution',
            title: t('homePage.kpis.pprExecution'),
            value: ppr.executionPercent,
            suffix: '%',
            icon: <CheckCircleOutlined />,
            color: ppr.executionPercent >= 80 ? token.colorSuccess : token.colorWarning,
            link: '/ppr-calendar',
          },
          {
            key: 'ppr-pending',
            title: t('homePage.kpis.pprPendingApproval'),
            value: ppr.pendingApprovalMonths,
            icon: <CalendarOutlined />,
            color: ppr.pendingApprovalMonths > 0 ? token.colorWarning : token.colorTextSecondary,
            link: '/ppr-calendar',
          },
        ]
      : []),
  ]

  if (cards.length === 0) {
    return null
  }

  const colSpan = cards.length >= 6 ? { xs: 24, sm: 12, lg: 8, xl: 4 } : { xs: 24, sm: 12, lg: 8, xl: 6 }

  return (
    <Row gutter={[HOME_PAGE_GAP, HOME_PAGE_GAP]}>
      {cards.map((card) => {
        const content = (
          <Card
            hoverable={Boolean(card.link)}
            style={{
              height: '100%',
              borderColor: token.colorBorderSecondary,
            }}
          >
            <Statistic
              title={card.title}
              value={card.value}
              suffix={card.suffix}
              prefix={card.icon}
              valueStyle={{ color: card.color, fontSize: 28 }}
            />
          </Card>
        )

        return (
          <Col key={card.key} {...colSpan}>
            {card.link ? (
              <Link to={card.link} style={{ textDecoration: 'none', color: 'inherit' }}>
                {content}
              </Link>
            ) : (
              content
            )}
          </Col>
        )
      })}
    </Row>
  )
}
