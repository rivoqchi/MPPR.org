import { LogoutOutlined, MenuOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Dropdown, Layout, Modal, Select, Space, theme } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { logoutFromApi } from '@/shared/api/auth-api'
import { resetAppDataSession } from '@/shared/lib/realtime/sync-app-data'
import { clearTokens } from '@/shared/lib/token-storage'
import { getUserShortName } from '@/entities/user/lib/user-display'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { APP_LOCALES, LOCALE_LABELS } from '@/shared/lib/constants'
import { useLocaleSync } from '@/shared/hooks/useLocaleSync'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useUiStore } from '@/shared/stores/ui-store'
import type { AppLocale } from '@/shared/types'
import { AppBreadcrumb } from '@/widgets/layout/AppBreadcrumb'
import { ThemeModeToggle } from '@/widgets/layout/ThemeModeToggle'
import { NotificationBell } from '@/features/notifications/ui/NotificationBell'

const { Header } = Layout

function VerifiedBadge({ size = 18, color }: { size?: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M12 1.5l1.9 1.2 2.15-.35.85 2 2 .85-.35 2.15L20.5 12l-1.2 1.9.35 2.15-2 .85-.85 2-2.15-.35L12 22.5l-1.9-1.2-2.15.35-.85-2-2-.85.35-2.15L3.5 12l1.2-1.9-.35-2.15 2-.85.85-2 2.15.35L12 1.5z"
        fill={color}
      />
      <path
        d="M10.2 15.4L7.4 12.6l1.2-1.2 1.6 1.6 4.2-4.2 1.2 1.2-5.4 5.4z"
        fill="#ffffff"
      />
    </svg>
  )
}

interface AppHeaderProps {
  compact?: boolean
  showMenuButton?: boolean
  onMenuOpen?: () => void
}

export function AppHeader({ compact = false, showMenuButton = false, onMenuOpen }: AppHeaderProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { canView } = useRolePermissions()
  const locale = useUiStore((state) => state.locale)
  const setLocale = useUiStore((state) => state.setLocale)
  const currentUser = useAuthStore((state) => state.currentUser)
  const logout = useAuthStore((state) => state.logout)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const canOpenSettings = canView('/settings')
  const isSettingsActive = location.pathname === '/settings'

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

          {canOpenSettings && (
            <Button
              type="text"
              aria-label={t('menu.settings')}
              aria-current={isSettingsActive ? 'page' : undefined}
              icon={
                <SettingOutlined
                  style={{
                    fontSize: 18,
                    color: isSettingsActive ? token.colorPrimary : undefined,
                  }}
                />
              }
              onClick={() => navigate('/settings')}
            />
          )}

          <NotificationBell />

          {currentUser && (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Space size={6} style={{ cursor: 'pointer', alignItems: 'center' }}>
                <VerifiedBadge size={compact ? 16 : 18} color={token.colorPrimary} />
                <span
                  style={{
                    color: token.colorText,
                    fontWeight: 600,
                    fontSize: compact ? 13 : 14,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getUserShortName(currentUser)}
                </span>
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
