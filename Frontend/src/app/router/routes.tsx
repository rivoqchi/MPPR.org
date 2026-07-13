import type { RouteObject } from 'react-router-dom'
import { HomePage, ApplicationCalendarPage, ApplicationWorkflowPage, ErrorLogsPage, IncomingApplicationPage, ManagementPage, ObjectPage, PlaceholderPage, PprCalendarPage, PprManagementMonthPage, PprManagementPage, PprTypePage, ProfilePage, RolesPage, SettingsPage, StructuralUnitPage, SubmitApplicationPage, UsersPage, lazyRoute, applicationCalendarRouteFallback, errorLogsRouteFallback, objectRouteFallback, pprCalendarRouteFallback, pprTypeRouteFallback, rolesRouteFallback, structuralUnitRouteFallback, submitApplicationRouteFallback, usersRouteFallback } from '@/app/router/lazy-route'

function page(titleKey: string): Pick<RouteObject, 'element' | 'handle'> {
  return {
    element: lazyRoute(<PlaceholderPage />),
    handle: { titleKey },
  }
}

export const appRoutes: RouteObject[] = [
  {
    index: true,
    element: lazyRoute(<HomePage />),
    handle: { titleKey: 'menu.home' },
  },
  {
    path: 'guide',
    ...page('menu.guide'),
  },
  {
    path: 'settings',
    element: lazyRoute(<SettingsPage />),
    handle: { titleKey: 'menu.settings' },
  },
  {
    path: 'profile',
    element: lazyRoute(<ProfilePage />),
    handle: { titleKey: 'menu.profile' },
  },
  {
    path: 'applications/submit',
    element: lazyRoute(<SubmitApplicationPage />, submitApplicationRouteFallback),
    handle: { titleKey: 'menu.applications.submit' },
    children: [
      {
        path: 'workflow/:applicationId',
        element: lazyRoute(<ApplicationWorkflowPage />, submitApplicationRouteFallback),
        handle: { titleKey: 'applicationWorkflow.title' },
      },
    ],
  },
  {
    path: 'applications/incoming',
    element: lazyRoute(<IncomingApplicationPage />, submitApplicationRouteFallback),
    handle: { titleKey: 'menu.applications.incoming' },
    children: [
      {
        path: 'workflow/:applicationId',
        element: lazyRoute(<ApplicationWorkflowPage />, submitApplicationRouteFallback),
        handle: { titleKey: 'applicationWorkflow.title' },
      },
    ],
  },
  {
    path: 'applications/calendar',
    element: lazyRoute(<ApplicationCalendarPage />, applicationCalendarRouteFallback),
    handle: { titleKey: 'menu.applications.calendar' },
  },
  {
    path: 'ppr-calendar',
    element: lazyRoute(<PprCalendarPage />, pprCalendarRouteFallback),
    handle: { titleKey: 'menu.pprCalendar' },
  },
  {
    path: 'registration/ppr-type',
    element: lazyRoute(<PprTypePage />, pprTypeRouteFallback),
    handle: { titleKey: 'menu.registration.pprType' },
  },
  {
    path: 'registration/structural-units',
    element: lazyRoute(<StructuralUnitPage />, structuralUnitRouteFallback),
    handle: { titleKey: 'menu.registration.structuralUnits' },
  },
  {
    path: 'registration/objects',
    element: lazyRoute(<ObjectPage />, objectRouteFallback),
    handle: { titleKey: 'menu.registration.objects' },
  },
  {
    path: 'management',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.hub' },
  },
  {
    path: 'management/ppr',
    element: lazyRoute(<PprManagementPage />),
    handle: { titleKey: 'menu.management.ppr' },
  },
  {
    path: 'management/ppr/:monthId',
    element: lazyRoute(<PprManagementMonthPage />),
    handle: { titleKey: 'pprManagement.monthDetail' },
  },
  {
    path: 'management/users',
    element: lazyRoute(<UsersPage />, usersRouteFallback),
    handle: { titleKey: 'menu.management.users' },
  },
  {
    path: 'management/roles',
    element: lazyRoute(<RolesPage />, rolesRouteFallback),
    handle: { titleKey: 'menu.management.roles' },
  },
  {
    path: 'management/employees',
    ...page('menu.management.employees'),
  },
  {
    path: 'management/programs',
    ...page('menu.management.programs'),
  },
  {
    path: 'management/errors',
    element: lazyRoute(<ErrorLogsPage />, errorLogsRouteFallback),
    handle: { titleKey: 'menu.management.errors' },
  },
  {
    path: 'management/changes',
    ...page('menu.management.changes'),
  },
]
