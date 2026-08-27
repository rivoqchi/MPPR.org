import { Menu } from 'antd'
import { useLocation } from 'react-router-dom'
import type { SidebarPosition } from '@/shared/types'
import { AppBrandHeader } from '@/shared/ui/AppBrand'
import { ChatSidebarPanel } from '@/features/chat/ui/ChatSidebarPanel'
import { SidebarSkeleton } from '@/widgets/layout/SidebarSkeleton'
import { useSidebarMenu } from '@/widgets/layout/use-sidebar-menu'

interface SidebarContentProps {
  collapsed?: boolean
  sidebarPosition?: SidebarPosition
  onNavigate?: () => void
}

function isChatRoute(pathname: string) {
  return pathname === '/chat' || pathname.startsWith('/chat/')
}

export function SidebarContent({
  collapsed = false,
  sidebarPosition = 'left',
  onNavigate,
}: SidebarContentProps) {
  const location = useLocation()
  const isChat = isChatRoute(location.pathname)
  const { activeMenuPath, openKeys, menuItems, handleOpenChange, isMenuLoading } = useSidebarMenu()

  if (isChat) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ChatSidebarPanel collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    )
  }

  if (isMenuLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SidebarSkeleton collapsed={collapsed} />
      </div>
    )
  }

  return (
    <>
      <AppBrandHeader collapsed={collapsed} />
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
