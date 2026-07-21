import type { RouteObject } from 'react-router-dom'
import {
  ApplicationCalendarPage,
  ApplicationWorkflowPage,
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
  lazyRoute,
  objectRouteFallback,
  pprCalendarRouteFallback,
  pprTypeRouteFallback,
  structuralUnitRouteFallback,
  submitApplicationRouteFallback,
} from '@/app/router/lazy-route'

export const appRoutes: RouteObject[] = [
  {
    index: true,
    element: lazyRoute(<HomePage />),
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
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.users' },
  },
  {
    path: 'management/roles',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.roles' },
  },
  {
    path: 'management/employees',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.employees' },
  },
  {
    path: 'management/programs',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.programs' },
  },
  {
    path: 'management/errors',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.errors' },
  },
  {
    path: 'management/changes',
    element: lazyRoute(<ManagementPage />),
    handle: { titleKey: 'menu.management.changes' },
  },
]
