import { Layout, theme } from 'antd'
import { useUiStore } from '@/shared/stores/ui-store'
import { SidebarContent } from '@/widgets/layout/SidebarContent'

const { Sider } = Layout

export function AppSidebar() {
  const { token } = theme.useToken()
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const sidebarPosition = useUiStore((state) => state.sidebarPosition)
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed)

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setSidebarCollapsed}
      width={280}
      reverseArrow={sidebarPosition === 'right'}
      style={{ background: token.colorBgContainer, height: '100vh', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
        <SidebarContent collapsed={collapsed} sidebarPosition={sidebarPosition} />
      </div>
    </Sider>
  )
}
