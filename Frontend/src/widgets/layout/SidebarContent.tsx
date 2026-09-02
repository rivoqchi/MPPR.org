import { Menu } from 'antd'
import { useLocation } from 'react-router-dom'
import type { SidebarPosition } from '@/shared/types'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { AppBrandHeader } from '@/shared/ui/AppBrand'
import { ChatSidebarPanel } from '@/features/chat/ui/ChatSidebarPanel'
import { SidebarFooter } from '@/widgets/layout/SidebarFooter'
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
  const { canView } = useRolePermissions()
  const { activeMenuPath, openKeys, menuItems, handleOpenChange, isMenuLoading } = useSidebarMenu()
  const canSubmitApplication = canView('/applications/submit')
  const canCreateDocument = canView('/documents/new')
  const canCreateArchive = canView('/archives/new')
  const canShowNewActions = canSubmitApplication || canCreateDocument || canCreateArchive

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppBrandHeader
        collapsed={collapsed}
        showAction={canShowNewActions}
        onActionClick={onNavigate}
      />
      <Menu
        mode="inline"
        selectedKeys={[activeMenuPath]}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        onClick={onNavigate}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          ...(sidebarPosition === 'right'
            ? { borderInlineStart: 'none' }
            : { borderInlineEnd: 'none' }),
        }}
      />
      <SidebarFooter collapsed={collapsed} />
    </div>
  )
}
