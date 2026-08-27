import { PhoneOutlined } from '@ant-design/icons'
import { theme, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { STRUCTURAL_UNIT_DISPLAY_NUMBER } from '@/shared/lib/constants'

interface SidebarFooterProps {
  collapsed?: boolean
}

export function SidebarFooter({ collapsed = false }: SidebarFooterProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()

  return (
    <div
      style={{
        flexShrink: 0,
        padding: collapsed ? '12px 8px' : '14px 16px 16px',
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillQuaternary,
      }}
    >
      {collapsed ? (
        <Typography.Text
          strong
          style={{
            display: 'block',
            textAlign: 'center',
            color: token.colorText,
            fontSize: 12,
            lineHeight: 1.2,
          }}
        >
          {STRUCTURAL_UNIT_DISPLAY_NUMBER}
        </Typography.Text>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PhoneOutlined
            style={{
              color: token.colorSuccess,
              fontSize: 16,
              flexShrink: 0,
            }}
          />
          <Typography.Text
            strong
            style={{
              color: token.colorText,
              fontSize: 13,
              lineHeight: 1.3,
              fontWeight: 700,
            }}
          >
            {t('layout.structuralUnitNumber', { number: STRUCTURAL_UNIT_DISPLAY_NUMBER })}
          </Typography.Text>
        </div>
      )}
    </div>
  )
}
