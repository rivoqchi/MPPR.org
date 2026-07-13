import { Card, Col, Row, Typography, theme } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MENU_CONFIG } from '@/shared/config/menu'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { scrollablePageStyle } from '@/shared/lib/page-layout'

const { Title, Paragraph } = Typography

export function ManagementPage() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { canView } = useRolePermissions()

  const cards = useMemo(() => {
    const management = MENU_CONFIG.find((item) => item.key === 'management')

    return (management?.children ?? [])
      .filter((item) => item.path && canView(item.path))
      .map((item) => ({
        key: item.path!,
        title: t(item.labelKey),
        path: item.path!,
      }))
  }, [canView, t])

  return (
    <div style={{ ...scrollablePageStyle, gap: 20 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          {t('managementPage.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {t('managementPage.subtitle')}
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.key} xs={24} sm={12} lg={8} xl={6}>
            <Link to={card.path} style={{ textDecoration: 'none' }}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderColor: token.colorBorderSecondary,
                  background: token.colorBgContainer,
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  {card.title}
                </Title>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  )
}
