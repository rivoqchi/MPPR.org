import { Layout, theme } from 'antd'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useLayoutBreakpoint } from '@/shared/hooks/useLayoutBreakpoint'
import { MOBILE_PAGE_CONTENT_PADDING, PAGE_CONTENT_PADDING } from '@/shared/lib/page-layout'
import { useUiStore } from '@/shared/stores/ui-store'
import { AppHeader } from '@/widgets/layout/AppHeader'
import { AppSidebar } from '@/widgets/layout/AppSidebar'
import { MobileSidebarDrawer } from '@/widgets/layout/MobileSidebarDrawer'

const { Content } = Layout

export function MainLayout() {
  const { token } = theme.useToken()
  const { isDesktop, isMobileOrTablet } = useLayoutBreakpoint()
  const sidebarPosition = useUiStore((state) => state.sidebarPosition)
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (isDesktop) {
      setMobileMenuOpen(false)
    }
  }, [isDesktop])

  const mainContent = (
    <Layout
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppHeader
        compact={isMobileOrTablet}
        showMenuButton={isMobileOrTablet}
        onMenuOpen={() => setMobileMenuOpen(true)}
      />
      <Content
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: token.colorBgLayout,
          padding: isDesktop ? PAGE_CONTENT_PADDING : MOBILE_PAGE_CONTENT_PADDING,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Outlet />
        </div>
      </Content>
    </Layout>
  )

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex' }}>
      {isDesktop && sidebarPosition === 'left' ? <AppSidebar /> : null}
      {mainContent}
      {isDesktop && sidebarPosition === 'right' ? <AppSidebar /> : null}

      {isMobileOrTablet && (
        <MobileSidebarDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      )}
    </Layout>
  )
}
