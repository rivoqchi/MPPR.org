import { Drawer } from 'antd'
import { useUiStore } from '@/shared/stores/ui-store'
import { SidebarContent } from '@/widgets/layout/SidebarContent'

interface MobileSidebarDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebarDrawer({ open, onClose }: MobileSidebarDrawerProps) {
  const sidebarPosition = useUiStore((state) => state.sidebarPosition)

  return (
    <Drawer
      placement={sidebarPosition}
      open={open}
      onClose={onClose}
      width={280}
      closable={false}
      styles={{ body: { padding: 0, height: '100vh', overflow: 'hidden' } }}
    >
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <SidebarContent sidebarPosition={sidebarPosition} onNavigate={onClose} />
      </div>
    </Drawer>
  )
}
