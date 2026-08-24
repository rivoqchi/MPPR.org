import { Result, Tabs } from 'antd'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ApplicationCalendarPage } from '@/features/application-calendar/ui/ApplicationCalendarPage'
import { EmployeesPage } from '@/features/employees/ui/EmployeesPage'
import { ErrorLogsPage } from '@/features/error-logs/ui/ErrorLogsPage'
import {
  ManagementApplicationsTab,
  type ManagementApplicationsSubtab,
} from '@/features/management/ui/ManagementApplicationsTab'
import { ObjectPage } from '@/features/object/ui/ObjectPage'
import { PlaceholderPage } from '@/features/placeholder/ui/PlaceholderPage'
import { PprCalendarPage } from '@/features/ppr-calendar/ui/PprCalendarPage'
import { PprManagementPage } from '@/features/ppr-management/ui/PprManagementPage'
import { PprTypePage } from '@/features/ppr-type/ui/PprTypePage'
import { RolesPage } from '@/features/roles/ui/RolesPage'
import { StructuralUnitPage } from '@/features/structural-unit/ui/StructuralUnitPage'
import { UsersPage } from '@/features/users/ui/UsersPage'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

type ManagementTabKey = 'ppr' | 'registration' | 'applications' | 'service'
type PprSubtabKey = 'calendar' | 'approved'
type RegistrationSubtabKey = 'ppr-type' | 'structural-units' | 'objects'
type ApplicationsSubtabKey = ManagementApplicationsSubtab | 'calendar'
type ServiceSubtabKey = 'users' | 'roles' | 'errors' | 'employees' | 'programs' | 'changes'

const DEFAULT_SUBTAB: Record<ManagementTabKey, string> = {
  ppr: 'calendar',
  registration: 'ppr-type',
  applications: 'submitted',
  service: 'users',
}

const SUBTAB_PAGE_KEYS: Record<ManagementTabKey, Record<string, string>> = {
  ppr: {
    calendar: '/ppr-calendar',
    approved: '/management/ppr',
  },
  registration: {
    'ppr-type': '/registration/ppr-type',
    'structural-units': '/registration/structural-units',
    objects: '/registration/objects',
  },
  applications: {
    submitted: '/applications/submit',
    incoming: '/applications/incoming',
    workflow: '/applications/incoming',
    calendar: '/applications/calendar',
  },
  service: {
    users: '/management/users',
    roles: '/management/roles',
    errors: '/management/errors',
    employees: '/management/employees',
    programs: '/management/programs',
    changes: '/management/changes',
  },
}

function normalizeTab(value: string | null): ManagementTabKey {
  if (value === 'ppr' || value === 'registration' || value === 'applications' || value === 'service') {
    return value
  }

  return 'ppr'
}

function resolveManagementLocation(pathname: string): {
  tab: ManagementTabKey
  subtab: string
} {
  if (pathname === '/management/ppr') {
    return { tab: 'ppr', subtab: 'approved' }
  }

  if (pathname === '/management/users') {
    return { tab: 'service', subtab: 'users' }
  }

  if (pathname === '/management/roles') {
    return { tab: 'service', subtab: 'roles' }
  }

  if (pathname === '/management/errors') {
    return { tab: 'service', subtab: 'errors' }
  }

  if (pathname === '/management/employees') {
    return { tab: 'service', subtab: 'employees' }
  }

  if (pathname === '/management/programs') {
    return { tab: 'service', subtab: 'programs' }
  }

  if (pathname === '/management/changes') {
    return { tab: 'service', subtab: 'changes' }
  }

  return { tab: 'ppr', subtab: DEFAULT_SUBTAB.ppr }
}

function getPageKeyForSubtab(tab: ManagementTabKey, subtab: string): string | undefined {
  return SUBTAB_PAGE_KEYS[tab]?.[subtab]
}

export function ManagementPage() {
  const { t } = useTranslation()
  const { canView } = useRolePermissions()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const fallbackLocation = resolveManagementLocation(location.pathname)
  const requestedTab = normalizeTab(searchParams.get('tab') ?? fallbackLocation.tab)
  const requestedSubtab = searchParams.get('subtab') ?? fallbackLocation.subtab

  const canAccessHub =
    canView('/management') ||
    Object.values(SUBTAB_PAGE_KEYS).some((group) =>
      Object.values(group).some((pageKey) => canView(pageKey)),
    )

  const visiblePprItems = useMemo(
    () =>
      (
        [
          { key: 'calendar', label: t('managementPage.ppr.calendar') },
          { key: 'approved', label: t('managementPage.ppr.approved') },
        ] as Array<{ key: PprSubtabKey; label: string }>
      ).filter((item) => canView(SUBTAB_PAGE_KEYS.ppr[item.key])),
    [canView, t],
  )

  const visibleRegistrationItems = useMemo(
    () =>
      (
        [
          { key: 'ppr-type', label: t('menu.registration.pprType') },
          { key: 'structural-units', label: t('menu.registration.structuralUnits') },
          { key: 'objects', label: t('menu.registration.objects') },
        ] as Array<{ key: RegistrationSubtabKey; label: string }>
      ).filter((item) => canView(SUBTAB_PAGE_KEYS.registration[item.key])),
    [canView, t],
  )

  const visibleApplicationItems = useMemo(
    () =>
      (
        [
          { key: 'submitted', label: t('managementPage.applications.submitted') },
          { key: 'incoming', label: t('managementPage.applications.incoming') },
          { key: 'workflow', label: t('managementPage.applications.workflow') },
          { key: 'calendar', label: t('menu.applications.calendar') },
        ] as Array<{ key: ApplicationsSubtabKey; label: string }>
      ).filter((item) => canView(SUBTAB_PAGE_KEYS.applications[item.key])),
    [canView, t],
  )

  const visibleServiceItems = useMemo(
    () =>
      (
        [
          { key: 'users', label: t('menu.management.users') },
          { key: 'roles', label: t('menu.management.roles') },
          { key: 'errors', label: t('menu.management.errors') },
          { key: 'employees', label: t('menu.management.employees') },
          { key: 'programs', label: t('menu.management.programs') },
          { key: 'changes', label: t('menu.management.changes') },
        ] as Array<{ key: ServiceSubtabKey; label: string }>
      ).filter((item) => canView(SUBTAB_PAGE_KEYS.service[item.key])),
    [canView, t],
  )

  const topTabItems = useMemo(
    () =>
      [
        { key: 'ppr' as const, label: t('managementPage.tabs.ppr'), items: visiblePprItems },
        {
          key: 'registration' as const,
          label: t('managementPage.tabs.registration'),
          items: visibleRegistrationItems,
        },
        {
          key: 'applications' as const,
          label: t('managementPage.tabs.applications'),
          items: visibleApplicationItems,
        },
        {
          key: 'service' as const,
          label: t('managementPage.tabs.service'),
          items: visibleServiceItems,
        },
      ].filter((item) => item.items.length > 0),
    [
      t,
      visibleApplicationItems,
      visiblePprItems,
      visibleRegistrationItems,
      visibleServiceItems,
    ],
  )

  const itemsByTab: Record<ManagementTabKey, Array<{ key: string; label: string }>> = {
    ppr: visiblePprItems,
    registration: visibleRegistrationItems,
    applications: visibleApplicationItems,
    service: visibleServiceItems,
  }

  const tab =
    topTabItems.find((item) => item.key === requestedTab)?.key ?? topTabItems[0]?.key ?? 'ppr'
  const availableSubtabs = itemsByTab[tab]
  const subtab =
    availableSubtabs.find((item) => item.key === requestedSubtab)?.key ??
    availableSubtabs[0]?.key ??
    DEFAULT_SUBTAB[tab]

  const currentPageKey = getPageKeyForSubtab(tab, subtab)
  const canViewCurrent = currentPageKey ? canView(currentPageKey) : false

  useEffect(() => {
    if (!canAccessHub || topTabItems.length === 0) {
      return
    }

    if (requestedTab === tab && requestedSubtab === subtab) {
      return
    }

    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    params.set('subtab', subtab)
    setSearchParams(params, { replace: true })
  }, [
    canAccessHub,
    requestedSubtab,
    requestedTab,
    searchParams,
    setSearchParams,
    subtab,
    tab,
    topTabItems.length,
  ])

  const updateParams = (nextTab: ManagementTabKey, nextSubtab?: string) => {
    const nextItems = itemsByTab[nextTab]
    const resolvedSubtab =
      nextItems.find((item) => item.key === nextSubtab)?.key ?? nextItems[0]?.key

    if (!resolvedSubtab) {
      return
    }

    const params = new URLSearchParams(searchParams)
    params.set('tab', nextTab)
    params.set('subtab', resolvedSubtab)
    setSearchParams(params, { replace: true })
  }

  const renderSectionTabs = (items: Array<{ key: string; label: string }>) => (
    <Tabs activeKey={subtab} items={items} onChange={(key) => updateParams(tab, key)} />
  )

  const renderCurrentContent = () => {
    if (tab === 'ppr') {
      return (
        <>
          {renderSectionTabs(visiblePprItems)}
          <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>
            {subtab === 'calendar' ? <PprCalendarPage /> : <PprManagementPage />}
          </div>
        </>
      )
    }

    if (tab === 'registration') {
      return (
        <>
          {renderSectionTabs(visibleRegistrationItems)}
          <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>
            {subtab === 'ppr-type' ? <PprTypePage /> : null}
            {subtab === 'structural-units' ? <StructuralUnitPage /> : null}
            {subtab === 'objects' ? <ObjectPage /> : null}
          </div>
        </>
      )
    }

    if (tab === 'applications') {
      return (
        <>
          {renderSectionTabs(visibleApplicationItems)}
          <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>
            {subtab === 'calendar' ? (
              <ApplicationCalendarPage />
            ) : (
              <ManagementApplicationsTab
                subtab={subtab as ManagementApplicationsSubtab}
                onSubtabChange={(nextSubtab) => updateParams('applications', nextSubtab)}
              />
            )}
          </div>
        </>
      )
    }

    return (
      <>
        {renderSectionTabs(visibleServiceItems)}
        <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>
          {subtab === 'users' ? <UsersPage /> : null}
          {subtab === 'roles' ? <RolesPage /> : null}
          {subtab === 'errors' ? <ErrorLogsPage /> : null}
          {subtab === 'employees' ? <EmployeesPage /> : null}
          {subtab === 'programs' ? <PlaceholderPage /> : null}
          {subtab === 'changes' ? <PlaceholderPage /> : null}
        </div>
      </>
    )
  }

  if (!canAccessHub || topTabItems.length === 0 || !canViewCurrent) {
    return (
      <div style={{ ...fullHeightPageStyle, justifyContent: 'center' }}>
        <Result
          status="403"
          title={t('managementPage.forbiddenTitle')}
          subTitle={t('managementPage.forbiddenDescription')}
        />
      </div>
    )
  }

  return (
    <div style={{ ...fullHeightPageStyle, gap: 16 }}>
      <Tabs
        activeKey={tab}
        items={topTabItems.map(({ key, label }) => ({ key, label }))}
        onChange={(key) => updateParams(key as ManagementTabKey)}
      />

      <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>{renderCurrentContent()}</div>
    </div>
  )
}
