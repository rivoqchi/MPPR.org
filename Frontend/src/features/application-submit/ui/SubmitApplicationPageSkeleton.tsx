import { Skeleton, theme } from 'antd'
import { fullHeightPageStyle, getSplitPanelListShellStyle, splitPageRowStyle } from '@/shared/lib/page-layout'

export function SubmitApplicationPageSkeleton() {
  const { token } = theme.useToken()

  return (
    <div style={fullHeightPageStyle}>
      <div
        style={{
          flexShrink: 0,
          marginBottom: 12,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: '12px 16px',
        }}
      >
        <Skeleton.Input active block style={{ maxWidth: 720 }} />
      </div>

      <div style={splitPageRowStyle}>
        <div
          style={{
            width: 360,
            minWidth: 360,
            flexShrink: 0,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            ...getSplitPanelListShellStyle(token),
          }}
        >
          <Skeleton.Input active size="large" block />
          <Skeleton.Input active block />
          <Skeleton.Input active block />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton.Button key={index} active block size="large" style={{ height: 72 }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      </div>
    </div>
  )
}
