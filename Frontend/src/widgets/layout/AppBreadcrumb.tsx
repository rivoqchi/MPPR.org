import { Breadcrumb } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { getMenuBreadcrumbTrail } from '@/shared/config/menu'

export function AppBreadcrumb() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const items = useMemo(() => {
    const trail = getMenuBreadcrumbTrail(pathname)

    return trail.map((item, index) => {
      const isLast = index === trail.length - 1
      const title = t(item.labelKey)

      if (item.path && !isLast) {
        return { title: <Link to={item.path}>{title}</Link> }
      }

      return { title }
    })
  }, [pathname, t])

  return <Breadcrumb items={items} />
}
