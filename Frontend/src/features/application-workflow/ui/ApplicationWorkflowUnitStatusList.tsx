import { Tag, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Application } from '@/entities/application/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { ensureApplicationWorkflowUnitStatuses } from '@/features/application-workflow/lib/workflow-unit-status'
import { getWorkflowStatusTagColor } from '@/features/application-workflow/lib/workflow-access'

interface ApplicationWorkflowUnitStatusListProps {
  application: Application
  highlightStructuralUnitId?: string
}

export function ApplicationWorkflowUnitStatusList({
  application,
  highlightStructuralUnitId,
}: ApplicationWorkflowUnitStatusListProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const unitStatuses = ensureApplicationWorkflowUnitStatuses(application)

  if (unitStatuses.length === 0) {
    return null
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>
        {t('applicationWorkflow.unitStatuses.title')}
      </div>
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
        }}
      >
        {unitStatuses.map((item, index) => {
          const unit = structuralUnits.find((unitItem) => unitItem.id === item.structuralUnitId)
          const isHighlighted = item.structuralUnitId === highlightStructuralUnitId

          return (
            <div
              key={item.structuralUnitId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                background: isHighlighted ? token.colorPrimaryBg : token.colorBgContainer,
                borderTop: index > 0 ? `1px solid ${token.colorBorderSecondary}` : undefined,
              }}
            >
              <div style={{ fontWeight: isHighlighted ? 600 : 500 }}>
                {unit ? `${unit.shortName} — ${unit.originalName}` : item.structuralUnitId}
              </div>
              <Tag color={getWorkflowStatusTagColor(item.workflowStatus)} style={{ margin: 0 }}>
                {t(`applicationWorkflow.status.${item.workflowStatus}`)}
              </Tag>
            </div>
          )
        })}
      </div>
    </div>
  )
}
