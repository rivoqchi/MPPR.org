import { Skeleton, theme } from 'antd'
import {
  detailPanelScrollStyle,
  fullHeightPageStyle,
  getDetailPanelCardStyle,
  getSplitPanelListShellStyle,
  splitPageRowStyle,
} from '@/shared/lib/page-layout'
import { UserListSkeleton } from '@/shared/ui/skeleton'

export function UsersPageSkeleton() {
  const { token } = theme.useToken()

  return (
    <div style={fullHeightPageStyle}>
      <div style={splitPageRowStyle}>
        <div
          style={{
            width: 320,
            minWidth: 320,
            flexShrink: 0,
            ...getSplitPanelListShellStyle(token),
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Skeleton.Input active style={{ width: 140 }} />
            <Skeleton.Button active style={{ width: 96 }} />
          </div>
          <UserListSkeleton />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            background: token.colorBgLayout,
          }}
        >
          <div style={detailPanelScrollStyle}>
            <div
              style={{
                ...getDetailPanelCardStyle(token),
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <Skeleton.Avatar active size={160} />
                <Skeleton.Input active size="large" style={{ width: 220 }} />
                <Skeleton.Button active style={{ width: 120 }} />
              </div>
              <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 32 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
