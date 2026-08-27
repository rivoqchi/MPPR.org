import type { RouteObject } from 'react-router-dom'
import { Navigate, useParams } from 'react-router-dom'
import {
  ApplicationCalendarPage,
  ChatPage,
  GuidePage,
  HomePage,
  IncomingApplicationPage,
  ManagementPage,
  ObjectPage,
  PprCalendarPage,
  PprManagementMonthPage,
  PprTypePage,
  ProfilePage,
  SettingsPage,
  StructuralUnitPage,
  SubmitApplicationPage,
  applicationCalendarRouteFallback,
  errorLogsRouteFallback,
  homeRouteFallback,
  lazyRoute,
  objectRouteFallback,
  pprCalendarRouteFallback,
  pprTypeRouteFallback,
  rolesRouteFallback,
  structuralUnitRouteFallback,
  submitApplicationRouteFallback,
  usersRouteFallback,
} from '@/app/router/lazy-route'

function WorkflowLegacyRedirect({ basePath }: { basePath: string }) {
  const { applicationId } = useParams()

  return (
    <Navigate
      replace
      to={`${basePath}?applicationId=${applicationId ?? ''}`}
    />
  )
}

export const appRoutes: RouteObject[] = [
  {
    index: true,
    element: lazyRoute(<HomePage />, homeRouteFallback),
    handle: { titleKey: 'menu.home' },
  },
  {
    path: 'guide',
    element: lazyRoute(<GuidePage />),
    handle: { titleKey: 'menu.guide' },
  },
  {
    path: 'settings',
    element: lazyRoute(<SettingsPage />),
    handle: { titleKey: 'menu.settings' },
  },
  {
    path: 'chat',
    element: lazyRoute(<ChatPage />),
    handle: { titleKey: 'menu.chat' },
  },
  {
    path: 'chat/:conversationId',
    element: lazyRoute(<ChatPage />),
    handle: { titleKey: 'menu.chat' },
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
  },
  {
    path: 'applications/submit/workflow/:applicationId',
    element: <WorkflowLegacyRedirect basePath="/applications/submit" />,
  },
  {
    path: 'applications/incoming',
    element: lazyRoute(<IncomingApplicationPage />, submitApplicationRouteFallback),
    handle: { titleKey: 'menu.applications.incoming' },
  },
  {
    path: 'applications/incoming/workflow/:applicationId',
    element: <WorkflowLegacyRedirect basePath="/applications/incoming" />,
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
    element: lazyRoute(<ManagementPage />, pprCalendarRouteFallback),
    handle: { titleKey: 'menu.management.hub' },
  },
  {
    path: 'management/ppr',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.ppr' },
  },
  {
    path: 'management/ppr/:monthId',
    element: lazyRoute(<PprManagementMonthPage />),
    handle: { titleKey: 'pprManagement.monthDetail' },
  },
  {
    path: 'management/users',
    element: lazyRoute(<ManagementPage />, usersRouteFallback),
    handle: { titleKey: 'menu.management.users' },
  },
  {
    path: 'management/roles',
    element: lazyRoute(<ManagementPage />, rolesRouteFallback),
    handle: { titleKey: 'menu.management.roles' },
  },
  {
    path: 'management/employees',
    element: lazyRoute(<ManagementPage />, usersRouteFallback),
    handle: { titleKey: 'menu.management.employees' },
  },
  {
    path: 'management/programs',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.programs' },
  },
  {
    path: 'management/errors',
    element: lazyRoute(<ManagementPage />, errorLogsRouteFallback),
    handle: { titleKey: 'menu.management.errors' },
  },
  {
    path: 'management/changes',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.changes' },
  },
]
