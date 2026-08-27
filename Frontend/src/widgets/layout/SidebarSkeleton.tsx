import { Skeleton, theme } from 'antd'
import { useMemo } from 'react'
import { MENU_CONFIG } from '@/shared/config/menu'

interface SidebarSkeletonProps {
  collapsed?: boolean
}

function getSidebarSkeletonRows(): Array<{ indent: number }> {
  return MENU_CONFIG.flatMap((item) => [
    { indent: 0 },
    ...(item.children?.map(() => ({ indent: 1 })) ?? []),
  ])
}

export function SidebarSkeleton({ collapsed = false }: SidebarSkeletonProps) {
  const { token } = theme.useToken()
  const rows = useMemo(() => getSidebarSkeletonRows(), [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          minHeight: collapsed ? 64 : 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '12px 8px' : '16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <Skeleton.Avatar active size={collapsed ? 36 : 48} />
        {!collapsed && (
          <>
            <Skeleton.Input
              active
              size="small"
              style={{ width: 168, minWidth: 168 }}
            />
            <Skeleton.Input
              active
              size="small"
              style={{ width: 200, minWidth: 200, height: 28 }}
            />
          </>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {rows.map((row, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingLeft: collapsed ? 0 : row.indent * 20,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <Skeleton.Avatar active size={18} shape="square" style={{ flexShrink: 0 }} />
            {!collapsed && (
              <Skeleton.Input
                active
                size="small"
                style={{
                  flex: 1,
                  maxWidth: row.indent ? 132 : 168,
                  minWidth: row.indent ? 96 : 120,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
