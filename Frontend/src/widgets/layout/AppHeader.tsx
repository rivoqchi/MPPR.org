import { LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Modal, Select, Space, theme } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { logoutFromApi } from '@/shared/api/auth-api'
import { resetAppDataSession } from '@/shared/lib/realtime/sync-app-data'
import { clearTokens } from '@/shared/lib/token-storage'
import { resolveMediaUrl } from '@/shared/lib/resolve-media-url'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { APP_LOCALES, LOCALE_LABELS } from '@/shared/lib/constants'
import { useLocaleSync } from '@/shared/hooks/useLocaleSync'
import { useUiStore } from '@/shared/stores/ui-store'
import type { AppLocale } from '@/shared/types'
import { AppBreadcrumb } from '@/widgets/layout/AppBreadcrumb'
import { ThemeModeToggle } from '@/widgets/layout/ThemeModeToggle'
import { NotificationBell } from '@/features/notifications/ui/NotificationBell'

const { Header } = Layout

interface AppHeaderProps {
  compact?: boolean
  showMenuButton?: boolean
  onMenuOpen?: () => void
}

export function AppHeader({ compact = false, showMenuButton = false, onMenuOpen }: AppHeaderProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const locale = useUiStore((state) => state.locale)
  const setLocale = useUiStore((state) => state.setLocale)
  const currentUser = useAuthStore((state) => state.currentUser)
  const logout = useAuthStore((state) => state.logout)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useLocaleSync()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutFromApi()
    } catch {
      // Ignore logout API errors and clear local session anyway.
    } finally {
      clearTokens()
      resetAppDataSession()
      logout()
      setLogoutModalOpen(false)
      setIsLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('auth.profile'),
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: t('auth.logout'),
      onClick: () => setLogoutModalOpen(true),
    },
  ]

  return (
    <>
      <Header
        style={{
          padding: compact ? '0 12px' : '0 24px',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: compact ? 8 : 16,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: compact ? 8 : 0,
          }}
        >
          {showMenuButton && (
            <Button
              type="text"
              aria-label={t('layout.openMenu')}
              icon={<MenuOutlined />}
              onClick={onMenuOpen}
              style={{ flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <AppBreadcrumb />
          </div>
        </div>

        <Space size={compact ? 'small' : 'large'} wrap={false} style={{ flexShrink: 0 }}>
          <Select<AppLocale>
            value={locale}
            size={compact ? 'small' : 'middle'}
            style={{ width: compact ? 104 : 140 }}
            onChange={setLocale}
            options={APP_LOCALES.map((value) => ({
              value,
              label: LOCALE_LABELS[value],
            }))}
          />

          <ThemeModeToggle size={compact ? 'small' : 'middle'} />

          <NotificationBell />

          {currentUser && (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={compact ? 'small' : 'default'}
                  src={resolveMediaUrl(currentUser.avatar)}
                  icon={!currentUser.avatar ? <UserOutlined /> : undefined}
                >
                  {!currentUser.avatar ? getUserInitials(currentUser) : undefined}
                </Avatar>
                {!compact && <span>{getUserFullName(currentUser)}</span>}
              </Space>
            </Dropdown>
          )}
        </Space>
      </Header>

      <Modal
        open={logoutModalOpen}
        title={t('auth.logout')}
        centered
        onCancel={() => {
          if (!isLoggingOut) {
            setLogoutModalOpen(false)
          }
        }}
        footer={
          <Space>
            <Button disabled={isLoggingOut} onClick={() => setLogoutModalOpen(false)}>
              {t('common.no')}
            </Button>
            <Button
              type="primary"
              danger
              loading={isLoggingOut}
              onClick={() => {
                void handleLogout()
              }}
            >
              {t('common.yes')}
            </Button>
          </Space>
        }
      >
        {t('auth.logoutConfirm')}
      </Modal>
    </>
  )
}
