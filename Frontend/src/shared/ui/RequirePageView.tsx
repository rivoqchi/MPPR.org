import { Result } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

type RequirePageViewProps = {
  pageKey: string
  children: ReactNode
}

export function RequirePageView({ pageKey, children }: RequirePageViewProps) {
  const { t } = useTranslation()
  const { canView } = useRolePermissions()

  if (!canView(pageKey)) {
    return (
      <div style={{ ...fullHeightPageStyle, justifyContent: 'center' }}>
        <Result
          status="403"
          title="403"
          subTitle={t('common.forbidden')}
        />
      </div>
    )
  }

  return children
}
