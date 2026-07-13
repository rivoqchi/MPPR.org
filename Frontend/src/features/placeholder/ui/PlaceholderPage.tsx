import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMatches } from 'react-router-dom'
import { scrollablePageStyle } from '@/shared/lib/page-layout'

interface RouteHandle {
  titleKey?: string
}

export function PlaceholderPage() {
  const { t } = useTranslation()
  const matches = useMatches()
  const titleKey = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.titleKey)?.handle as
    | RouteHandle
    | undefined

  const title = titleKey?.titleKey ? t(titleKey.titleKey) : t('menu.home')

  return (
    <div style={scrollablePageStyle}>
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        {title}
      </Typography.Title>
    </div>
  )
}
