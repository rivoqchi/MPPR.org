import { MessageOutlined } from '@ant-design/icons'
import { Tag, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import type { ApplicationSpecialMessage } from '@/entities/application/model/types'

interface ApplicationSpecialMessageCardProps {
  message: ApplicationSpecialMessage
}

export function ApplicationSpecialMessageCard({ message }: ApplicationSpecialMessageCardProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const unit = structuralUnits.find((item) => item.id === message.structuralUnitId)
  const unitLabel = unit ? unit.shortName : message.structuralUnitId

  return (
    <div
      style={{
        borderRadius: token.borderRadiusLG,
        padding: 16,
        background: `linear-gradient(135deg, ${token.colorWarningBg} 0%, ${token.colorPrimaryBg} 100%)`,
        border: `2px solid ${token.colorWarning}`,
        boxShadow: `0 8px 24px ${token.colorWarning}22`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ fontSize: 20, color: token.colorWarning }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: token.colorText }}>
            {t('applicationIncoming.specialMessage.highlightTitle')}
          </span>
        </div>
        <Tag color="gold" style={{ margin: 0 }}>
          {unitLabel}
        </Tag>
      </div>
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: token.colorText,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.message}
      </div>
    </div>
  )
}
