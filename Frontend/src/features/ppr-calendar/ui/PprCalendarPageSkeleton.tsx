import { Skeleton, theme } from 'antd'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

const WEEKDAY_COUNT = 7
const CALENDAR_ROW_COUNT = 6

export function PprCalendarPageSkeleton() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        ...fullHeightPageStyle,
        width: '100%',
        height: '100%',
        gap: 12,
      }}
    >
      <Skeleton.Input active style={{ width: 280, height: 32 }} />
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
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 16,
            padding: '16px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorFillAlter,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton.Button active size="default" style={{ width: 32 }} />
            <Skeleton.Button active size="default" style={{ width: 72 }} />
          </div>
          <Skeleton.Input active size="large" style={{ width: 220, height: 34 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Skeleton.Button active size="default" style={{ width: 32 }} />
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gridTemplateRows: `repeat(${CALENDAR_ROW_COUNT + 1}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: WEEKDAY_COUNT * (CALENDAR_ROW_COUNT + 1) }, (_, index) => (
            <div
              key={index}
              style={{
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                padding: 8,
              }}
            >
              <Skeleton.Avatar active size={30} shape="circle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
