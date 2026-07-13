import { Menu, theme } from 'antd'
import type { SidebarPosition } from '@/shared/types'
import { APP_LOGO_SHORT, APP_NAME } from '@/shared/lib/constants'
import { SidebarSkeleton } from '@/widgets/layout/SidebarSkeleton'
import { useSidebarMenu } from '@/widgets/layout/use-sidebar-menu'

interface SidebarContentProps {
  collapsed?: boolean
  sidebarPosition?: SidebarPosition
  onNavigate?: () => void
}

export function SidebarContent({
  collapsed = false,
  sidebarPosition = 'left',
  onNavigate,
}: SidebarContentProps) {
  const { token } = theme.useToken()
  const { activeMenuPath, openKeys, menuItems, handleOpenChange, isMenuLoading } = useSidebarMenu()

  if (isMenuLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SidebarSkeleton collapsed={collapsed} />
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: collapsed ? 14 : 18,
          color: token.colorPrimary,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {collapsed ? APP_LOGO_SHORT : APP_NAME}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[activeMenuPath]}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        onClick={onNavigate}
        style={
          sidebarPosition === 'right'
            ? { borderInlineStart: 'none' }
            : { borderInlineEnd: 'none' }
        }
      />
    </>
  )
}
