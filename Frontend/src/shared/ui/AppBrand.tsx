import { DownOutlined, FileWordOutlined, PlusOutlined, SendOutlined, SnippetsOutlined } from '@ant-design/icons'
import { Button, Dropdown, theme, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface AppBrandMarkProps {
  size?: number
}

export function AppBrandMark({ size = 48 }: AppBrandMarkProps) {
  const { token } = theme.useToken()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="24" cy="24" r="24" fill={token.colorPrimary} />
      <path
        d="M40.5 12.5C44.2 17.1 46 21.8 46 27.2C46 36.8 36.8 44.5 27.5 44.5C22.8 44.5 18.4 42.9 14.9 40.2C20.1 44.1 26.6 45.8 32.8 43.6C40.2 41 45 33.6 44.2 25.8C43.6 20.2 40.8 15.4 36.6 12.2C37.9 12 39.2 12.1 40.5 12.5Z"
        fill="rgba(255,255,255,0.22)"
      />
      <path
        d="M15.5 12.5H20.2L24 24.8L27.8 12.5H32.5L26.2 31.2V35.5H21.8V31.2L15.5 12.5Z"
        fill="#ffffff"
      />
    </svg>
  )
}

interface AppBrandHeaderProps {
  collapsed?: boolean
  compact?: boolean
  showBorder?: boolean
  showAction?: boolean
  onActionClick?: () => void
}

export function AppBrandHeader({
  collapsed = false,
  compact = false,
  showAction = false,
  onActionClick,
}: AppBrandHeaderProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const markSize = collapsed ? 36 : compact ? 56 : 48

  const actionMenuItems = useMemo<MenuProps['items']>(
    () => [
      { key: 'application', label: t('app.newApplication'), icon: <SendOutlined /> },
      { key: 'document', label: t('app.newDocument'), icon: <FileWordOutlined /> },
      { key: 'archive', label: t('app.newArchiveDocument'), icon: <SnippetsOutlined /> },
    ],
    [t],
  )

  const handleActionMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'document') {
      navigate('/documents/new')
    } else if (key === 'archive') {
      navigate('/archives/new')
    } else {
      navigate('/applications/submit')
    }

    onActionClick?.()
  }

  const actionButton = showAction ? (
    <Dropdown
      menu={{ items: actionMenuItems, onClick: handleActionMenuClick }}
      trigger={['click']}
      placement="bottom"
    >
      <Button
        type="primary"
        shape={collapsed ? 'circle' : 'round'}
        block={!collapsed}
        icon={<PlusOutlined />}
        style={{
          marginTop: collapsed ? 8 : 4,
          height: collapsed ? 36 : 40,
          fontWeight: 600,
          width: collapsed ? 36 : undefined,
        }}
      >
        {!collapsed && (
          <>
            {t('app.newDocuments')} <DownOutlined style={{ fontSize: 10 }} />
          </>
        )}
      </Button>
    </Dropdown>
  ) : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: collapsed ? 0 : 8,
        padding: collapsed ? '12px 8px' : compact ? '8px 12px 4px' : '16px 16px 14px',
        minHeight: collapsed ? 64 : undefined,
        flexShrink: 0,
        textAlign: 'center',
        width: '100%',
      }}
    >
      <AppBrandMark size={markSize} />
      {!collapsed && (
        <>
          <div style={{ maxWidth: '100%' }}>
            <Typography.Text
              strong
              style={{
                display: 'block',
                color: token.colorText,
                fontSize: compact ? 20 : 16,
                lineHeight: 1.3,
                fontWeight: 700,
              }}
            >
              {t('app.name')}
            </Typography.Text>
            <Typography.Text
              style={{
                display: 'block',
                marginTop: 4,
                color: token.colorTextSecondary,
                fontSize: compact ? 13 : 11,
                lineHeight: 1.35,
              }}
            >
              {t('app.tagline')}
            </Typography.Text>
          </div>
          {!compact && actionButton}
        </>
      )}
      {collapsed && actionButton}
    </div>
  )
}
