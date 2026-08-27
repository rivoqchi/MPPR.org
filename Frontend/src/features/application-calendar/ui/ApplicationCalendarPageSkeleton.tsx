import { Skeleton, theme } from 'antd'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

const WEEKDAY_COUNT = 7
const CALENDAR_ROW_COUNT = 6

export function ApplicationCalendarPageSkeleton() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        ...fullHeightPageStyle,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton.Input active size="default" style={{ width: 160, height: 28 }} />
            <Skeleton.Avatar active size={22} shape="circle" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Skeleton.Input active size="small" style={{ width: 200, minWidth: 200 }} />
            <Skeleton.Button active size="small" style={{ width: 96 }} />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {Array.from({ length: WEEKDAY_COUNT }, (_, index) => (
              <div
                key={index}
                style={{
                  padding: '10px 8px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Skeleton.Input active size="small" style={{ width: 56, minWidth: 56 }} />
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gridTemplateRows: `repeat(${CALENDAR_ROW_COUNT}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: WEEKDAY_COUNT * CALENDAR_ROW_COUNT }, (_, index) => (
              <div
                key={index}
                style={{
                  borderRight: `1px solid ${token.colorBorderSecondary}`,
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  background: token.colorBgContainer,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Skeleton.Button active size="small" style={{ width: 18, minWidth: 18, height: 16 }} />
                </div>
                <Skeleton.Avatar active size={9} shape="circle" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
