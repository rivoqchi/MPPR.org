import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { getMenuOpenKeys, resolveAccordionOpenKeys, resolveMenuPathname } from '@/shared/config/menu'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useRolesHydration } from '@/shared/hooks/useRolesHydration'
import { getSidebarMenuItems } from '@/widgets/layout/menu-items'

export function useSidebarMenu() {
  const { t } = useTranslation()
  const location = useLocation()
  const isRolesHydrated = useRolesHydration()
  const activeMenuPath = useMemo(
    () => resolveMenuPathname(location.pathname),
    [location.pathname],
  )
  const pathnameOpenKeys = useMemo(
    () => getMenuOpenKeys(location.pathname),
    [location.pathname],
  )
  const [openKeys, setOpenKeys] = useState<string[]>(pathnameOpenKeys)
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  const { canView } = useRolePermissions()

  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname)
    setOpenKeys(pathnameOpenKeys)
  }

  const menuItems = useMemo(() => getSidebarMenuItems(t, canView), [canView, t])

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys((previousKeys) => resolveAccordionOpenKeys(keys, previousKeys))
  }

  return {
    activeMenuPath,
    openKeys,
    menuItems,
    handleOpenChange,
    isMenuLoading: !isRolesHydrated,
  }
}
