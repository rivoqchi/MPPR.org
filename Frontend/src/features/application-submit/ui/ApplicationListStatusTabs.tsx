import { theme } from 'antd'
import type { GlobalToken } from 'antd/es/theme/interface'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '@/entities/application/model/types'
import {
  APPLICATION_LIST_STATUS_TAB_KEYS,
  countApplicationsByStatusTab,
  getApplicationListStatusTabLabelKey,
  type ApplicationListStatusTabKey,
} from '@/features/application-submit/lib/application-list-status-tabs'

interface ApplicationListStatusTabsProps {
  applications: Application[]
  activeKey: ApplicationListStatusTabKey
  onChange: (key: ApplicationListStatusTabKey) => void
}

function getStatusTabBadgeColors(
  key: ApplicationListStatusTabKey,
  token: GlobalToken,
): { background: string; color: string } {
  switch (key) {
    case 'all':
      return { background: token.colorPrimaryBg, color: token.colorPrimary }
    case 'completed':
      return { background: token.colorSuccessBg, color: token.colorSuccess }
    case 'not_completed':
      return { background: token.colorWarningBg, color: token.colorWarning }
    case 'in_progress':
      return { background: token.colorInfoBg, color: token.colorInfo }
    case 'completed_late':
      return { background: token.colorErrorBg, color: token.colorError }
    case 'pending_confirmation':
      return { background: 'rgba(250, 173, 20, 0.16)', color: '#d48806' }
    case 'unseen':
      return { background: token.colorFillSecondary, color: token.colorTextSecondary }
    case 'co_executor':
      return { background: 'rgba(114, 46, 209, 0.14)', color: '#722ed1' }
    default:
      return { background: token.colorFillSecondary, color: token.colorTextSecondary }
  }
}

export function ApplicationListStatusTabs({
  applications,
  activeKey,
  onChange,
}: ApplicationListStatusTabsProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()

  const counts = useMemo(() => countApplicationsByStatusTab(applications), [applications])

  return (
    <div
      role="tablist"
      aria-label={t('applicationSubmit.statusTabs.label')}
      style={{
        flexShrink: 0,
        marginBottom: 12,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 4,
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehaviorX: 'contain',
          padding: '0 8px',
          scrollbarWidth: 'thin',
        }}
      >
        {APPLICATION_LIST_STATUS_TAB_KEYS.map((key) => {
          const isActive = key === activeKey
          const badgeColors = getStatusTabBadgeColors(key, token)

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                margin: 0,
                padding: '12px 14px',
                border: 'none',
                borderBottom: `2px solid ${isActive ? token.colorPrimary : 'transparent'}`,
                background: 'transparent',
                color: isActive ? token.colorText : token.colorTextSecondary,
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                lineHeight: 1.2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {t(getApplicationListStatusTabLabelKey(key))}
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  paddingInline: 6,
                  borderRadius: 999,
                  background: badgeColors.background,
                  color: badgeColors.color,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {counts[key]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
