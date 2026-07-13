export type MenuItemConfig = {
  key: string
  labelKey: string
  path?: string
  icon?: string
  children?: MenuItemConfig[]
}

export const MENU_CONFIG: MenuItemConfig[] = [
  {
    key: '/',
    path: '/',
    labelKey: 'menu.home',
    icon: 'home',
  },
  {
    key: '/guide',
    path: '/guide',
    labelKey: 'menu.guide',
    icon: 'book',
  },
  {
    key: '/settings',
    path: '/settings',
    labelKey: 'menu.settings',
    icon: 'settings',
  },
  {
    key: 'applications',
    labelKey: 'menu.applications',
    icon: 'file',
    children: [
      {
        key: '/applications/submit',
        path: '/applications/submit',
        labelKey: 'menu.applications.submit',
      },
      {
        key: '/applications/incoming',
        path: '/applications/incoming',
        labelKey: 'menu.applications.incoming',
      },
      {
        key: '/applications/calendar',
        path: '/applications/calendar',
        labelKey: 'menu.applications.calendar',
      },
    ],
  },
  {
    key: '/ppr-calendar',
    path: '/ppr-calendar',
    labelKey: 'menu.pprCalendar',
    icon: 'calendar',
  },
  {
    key: 'registration',
    labelKey: 'menu.registration',
    icon: 'list',
    children: [
      {
        key: '/registration/ppr-type',
        path: '/registration/ppr-type',
        labelKey: 'menu.registration.pprType',
      },
      {
        key: '/registration/structural-units',
        path: '/registration/structural-units',
        labelKey: 'menu.registration.structuralUnits',
      },
      {
        key: '/registration/objects',
        path: '/registration/objects',
        labelKey: 'menu.registration.objects',
      },
    ],
  },
  {
    key: 'management',
    labelKey: 'menu.management',
    icon: 'control',
    children: [
      {
        key: '/management',
        path: '/management',
        labelKey: 'menu.management.hub',
      },
      {
        key: '/management/ppr',
        path: '/management/ppr',
        labelKey: 'menu.management.ppr',
      },
      {
        key: '/management/users',
        path: '/management/users',
        labelKey: 'menu.management.users',
      },
      {
        key: '/management/roles',
        path: '/management/roles',
        labelKey: 'menu.management.roles',
      },
      {
        key: '/management/employees',
        path: '/management/employees',
        labelKey: 'menu.management.employees',
      },
      {
        key: '/management/programs',
        path: '/management/programs',
        labelKey: 'menu.management.programs',
      },
      {
        key: '/management/errors',
        path: '/management/errors',
        labelKey: 'menu.management.errors',
      },
      {
        key: '/management/changes',
        path: '/management/changes',
        labelKey: 'menu.management.changes',
      },
    ],
  },
]

export const ROOT_SUBMENU_KEYS = ['applications', 'registration', 'management'] as const

export type RootSubmenuKey = (typeof ROOT_SUBMENU_KEYS)[number]

export function isRootSubmenuKey(key: string): key is RootSubmenuKey {
  return ROOT_SUBMENU_KEYS.includes(key as RootSubmenuKey)
}

export function resolveAccordionOpenKeys(keys: string[], previousKeys: string[]): string[] {
  const latestOpenKey = keys.find((key) => !previousKeys.includes(key))

  if (!latestOpenKey || !isRootSubmenuKey(latestOpenKey)) {
    return keys
  }

  return keys.filter((key) => isRootSubmenuKey(key) && key === latestOpenKey)
}

export function resolveMenuPathname(pathname: string): string {
  const workflowMatch = pathname.match(/^(\/applications\/(?:submit|incoming))\/workflow\/[^/]+$/)

  if (workflowMatch) {
    return workflowMatch[1]
  }

  if (pathname.match(/^\/management\/ppr\/[^/]+$/)) {
    return '/management/ppr'
  }

  return pathname
}

export function getMenuOpenKeys(pathname: string): string[] {
  const resolvedPathname = resolveMenuPathname(pathname)
  const openKeys: string[] = []

  if (resolvedPathname.startsWith('/applications')) {
    openKeys.push('applications')
  }

  if (pathname.startsWith('/registration')) {
    openKeys.push('registration')
  }

  if (pathname.startsWith('/management')) {
    openKeys.push('management')
  }

  return openKeys
}

export function flattenMenuPaths(items: MenuItemConfig[]): string[] {
  return items.flatMap((item) => [
    ...(item.path ? [item.path] : []),
    ...(item.children ? flattenMenuPaths(item.children) : []),
  ])
}

export function getMenuBreadcrumbTrail(pathname: string): MenuItemConfig[] {
  const resolvedPathname = resolveMenuPathname(pathname)

  function findTrail(
    items: MenuItemConfig[],
    trail: MenuItemConfig[] = [],
  ): MenuItemConfig[] | null {
    for (const item of items) {
      const currentTrail = [...trail, item]

      if (item.path === resolvedPathname) {
        return currentTrail
      }

      if (item.children) {
        const childTrail = findTrail(item.children, currentTrail)
        if (childTrail) {
          return childTrail
        }
      }
    }

    return null
  }

  const trail = findTrail(MENU_CONFIG) ?? []

  if (pathname.includes('/workflow/')) {
    return [...trail, { key: 'application-workflow', labelKey: 'applicationWorkflow.title' }]
  }

  if (pathname.match(/^\/management\/ppr\/[^/]+$/)) {
    const pprTrail = findTrail(MENU_CONFIG)?.filter((item) => item.path !== '/management') ?? trail

    const pprListItem = MENU_CONFIG.find((item) => item.key === 'management')
      ?.children?.find((item) => item.path === '/management/ppr')

    return [
      ...(pprListItem ? [pprListItem] : pprTrail),
      { key: 'ppr-management-month', labelKey: 'pprManagement.monthDetail' },
    ]
  }

  return trail
}
