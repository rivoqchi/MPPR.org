import { Result, Tabs } from 'antd'
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

const VALID_SUBTABS: Record<ManagementTabKey, Set<string>> = {
  ppr: new Set<PprSubtabKey>(['calendar', 'approved']),
  registration: new Set<RegistrationSubtabKey>(['ppr-type', 'structural-units', 'objects']),
  applications: new Set<ApplicationsSubtabKey>(['submitted', 'incoming', 'workflow', 'calendar']),
  service: new Set<ServiceSubtabKey>([
    'users',
    'roles',
    'errors',
    'employees',
    'programs',
    'changes',
  ]),
}

function normalizeTab(value: string | null): ManagementTabKey {
  if (value === 'ppr' || value === 'registration' || value === 'applications' || value === 'service') {
    return value
  }

  return 'ppr'
}

function normalizeSubtab(tab: ManagementTabKey, value: string | null): string {
  if (value && VALID_SUBTABS[tab].has(value)) {
    return value
  }

  return DEFAULT_SUBTAB[tab]
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

export function ManagementPage() {
  const { t } = useTranslation()
  const { role } = useRolePermissions()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const fallbackLocation = resolveManagementLocation(location.pathname)
  const tab = normalizeTab(searchParams.get('tab') ?? fallbackLocation.tab)
  const subtab = normalizeSubtab(tab, searchParams.get('subtab') ?? fallbackLocation.subtab)
  const isSystemAdmin = role?.isSystem === true || role?.name.trim().toLowerCase() === 'admin'

  const updateParams = (nextTab: ManagementTabKey, nextSubtab?: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', nextTab)
    params.set('subtab', normalizeSubtab(nextTab, nextSubtab ?? null))
    setSearchParams(params, { replace: true })
  }

  const topTabItems = [
    { key: 'ppr', label: t('managementPage.tabs.ppr') },
    { key: 'registration', label: t('managementPage.tabs.registration') },
    { key: 'applications', label: t('managementPage.tabs.applications') },
    { key: 'service', label: t('managementPage.tabs.service') },
  ]

  const pprItems = [
    { key: 'calendar', label: t('managementPage.ppr.calendar') },
    { key: 'approved', label: t('managementPage.ppr.approved') },
  ]

  const registrationItems = [
    { key: 'ppr-type', label: t('menu.registration.pprType') },
    { key: 'structural-units', label: t('menu.registration.structuralUnits') },
    { key: 'objects', label: t('menu.registration.objects') },
  ]

  const applicationItems = [
    { key: 'submitted', label: t('managementPage.applications.submitted') },
    { key: 'incoming', label: t('managementPage.applications.incoming') },
    { key: 'workflow', label: t('managementPage.applications.workflow') },
    { key: 'calendar', label: t('menu.applications.calendar') },
  ]

  const serviceItems = [
    { key: 'users', label: t('menu.management.users') },
    { key: 'roles', label: t('menu.management.roles') },
    { key: 'errors', label: t('menu.management.errors') },
    { key: 'employees', label: t('menu.management.employees') },
    { key: 'programs', label: t('menu.management.programs') },
    { key: 'changes', label: t('menu.management.changes') },
  ]

  const renderSectionTabs = (items: Array<{ key: string; label: string }>) => (
    <Tabs activeKey={subtab} items={items} onChange={(key) => updateParams(tab, key)} />
  )

  const renderCurrentContent = () => {
    if (tab === 'ppr') {
      return (
        <>
          {renderSectionTabs(pprItems)}
          <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>
            {subtab === 'calendar' ? <PprCalendarPage /> : <PprManagementPage />}
          </div>
        </>
      )
    }

    if (tab === 'registration') {
      return (
        <>
          {renderSectionTabs(registrationItems)}
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
          {renderSectionTabs(applicationItems)}
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
        {renderSectionTabs(serviceItems)}
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

  if (!isSystemAdmin) {
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
        items={topTabItems}
        onChange={(key) => updateParams(key as ManagementTabKey)}
      />

      <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>{renderCurrentContent()}</div>
    </div>
  )
}
