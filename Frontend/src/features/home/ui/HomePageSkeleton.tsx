import { Card, Col, Row, Skeleton, theme } from 'antd'
import { HOME_PAGE_GAP } from '@/features/home/lib/home-page-layout'

interface HomePageSkeletonProps {
  variant?: 'full' | 'content'
  showPprSection?: boolean
}

export function HomePageSkeleton({
  variant = 'content',
  showPprSection = true,
}: HomePageSkeletonProps) {
  const { token } = theme.useToken()

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HOME_PAGE_GAP, width: '100%' }}>
      <KpiCardsSkeleton />

      <Row gutter={[HOME_PAGE_GAP, HOME_PAGE_GAP]} align="stretch" style={{ width: '100%' }}>
        {showPprSection && (
          <Col xs={24} xl={12} style={{ display: 'flex' }}>
            <Card
              style={{
                width: '100%',
                flex: 1,
                borderColor: token.colorBorderSecondary,
              }}
            >
              <Skeleton active title paragraph={{ rows: 5 }} />
            </Card>
          </Col>
        )}

        <Col
          xs={24}
          xl={showPprSection ? 12 : 24}
          style={{ display: 'flex', minWidth: 0 }}
        >
          <div
            style={{
              flex: 1,
              width: '100%',
              height: showPprSection ? '100%' : 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gridTemplateRows: showPprSection ? 'repeat(2, minmax(0, 1fr))' : 'auto',
              gap: HOME_PAGE_GAP,
            }}
          >
            {Array.from({ length: showPprSection ? 4 : 3 }).map((_, index) => (
              <Card
                key={index}
                style={{
                  width: '100%',
                  height: '100%',
                  borderColor: token.colorBorderSecondary,
                }}
                styles={{ body: { height: '100%' } }}
              >
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            ))}
          </div>
        </Col>
      </Row>

      <ActivityPanelsSkeleton />
    </div>
  )

  if (variant === 'content') {
    return content
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: HOME_PAGE_GAP,
        width: '100%',
      }}
    >
      <div style={{ width: '100%' }}>
        <Skeleton.Input active block style={{ maxWidth: 320, height: 36 }} />
        <Skeleton.Input
          active
          block
          style={{ maxWidth: 480, height: 20, marginTop: 8 }}
        />
      </div>

      <Card
        size="small"
        style={{ width: '100%', borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 16 } }}
      >
        <Skeleton active paragraph={{ rows: 1 }} />
      </Card>

      {content}
    </div>
  )
}

function KpiCardsSkeleton() {
  const { token } = theme.useToken()

  return (
    <Row gutter={[HOME_PAGE_GAP, HOME_PAGE_GAP]} style={{ width: '100%' }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Col key={index} xs={24} sm={12} lg={8} xl={4}>
          <Card
            style={{ width: '100%', borderColor: token.colorBorderSecondary }}
          >
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}

function ActivityPanelsSkeleton() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: HOME_PAGE_GAP,
        width: '100%',
      }}
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          style={{ width: '100%', borderColor: token.colorBorderSecondary }}
        >
          <Skeleton active title paragraph={{ rows: index === 0 ? 2 : 4 }} />
        </Card>
      ))}
    </div>
  )
}
