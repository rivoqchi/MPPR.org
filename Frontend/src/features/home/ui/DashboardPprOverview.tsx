import { Card, Col, Progress, Row, Statistic, theme, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { HOME_PAGE_GAP } from '@/features/home/lib/home-page-layout'
import type { DashboardPprKpis } from '@/features/home/model/dashboard-types'

const { Text } = Typography

interface DashboardPprOverviewProps {
  ppr: DashboardPprKpis
}

export function DashboardPprOverview({ ppr }: DashboardPprOverviewProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  const totalMonths = ppr.draftMonths + ppr.pendingApprovalMonths + ppr.approvedMonths

  const statusItems = [
    {
      key: 'draft',
      label: t('homePage.ppr.statusDraft'),
      value: ppr.draftMonths,
      color: token.colorTextSecondary,
    },
    {
      key: 'pending',
      label: t('homePage.ppr.statusPending'),
      value: ppr.pendingApprovalMonths,
      color: token.colorWarning,
    },
    {
      key: 'approved',
      label: t('homePage.ppr.statusApproved'),
      value: ppr.approvedMonths,
      color: token.colorSuccess,
    },
  ]

  return (
    <Card title={t('homePage.ppr.title')} style={{ height: '100%' }}>
      <Row gutter={[HOME_PAGE_GAP, HOME_PAGE_GAP]}>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: HOME_PAGE_GAP }}>
            <Text type="secondary">{t('homePage.ppr.executionTitle')}</Text>
            <Progress
              percent={ppr.executionPercent}
              strokeColor={
                ppr.executionPercent >= 80
                  ? token.colorSuccess
                  : ppr.executionPercent >= 50
                    ? token.colorWarning
                    : token.colorError
              }
              style={{ marginTop: 8 }}
            />
          </div>
          <Row gutter={HOME_PAGE_GAP}>
            <Col span={12}>
              <Statistic
                title={t('homePage.ppr.plannedExecutions')}
                value={ppr.plannedExecutions}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title={t('homePage.ppr.completedExecutions')}
                value={ppr.completedExecutions}
              />
            </Col>
          </Row>
        </Col>

        <Col xs={24} md={12}>
          <Text type="secondary">{t('homePage.ppr.monthStatusTitle')}</Text>
          <div style={{ marginTop: HOME_PAGE_GAP, display: 'flex', flexDirection: 'column', gap: HOME_PAGE_GAP }}>
            {statusItems.map((item) => {
              const percent =
                totalMonths > 0 ? Math.round((item.value / totalMonths) * 100) : 0

              return (
                <div key={item.key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text>{item.label}</Text>
                    <Text strong>
                      {item.value}
                      {totalMonths > 0 ? ` (${percent}%)` : ''}
                    </Text>
                  </div>
                  <Progress
                    percent={percent}
                    showInfo={false}
                    strokeColor={item.color}
                    size="small"
                  />
                </div>
              )
            })}
          </div>
        </Col>
      </Row>
    </Card>
  )
}
