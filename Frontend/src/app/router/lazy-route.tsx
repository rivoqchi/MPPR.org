import { lazy, Suspense, type ReactNode } from 'react'
import { ErrorLogsPageSkeleton } from '@/features/error-logs/ui/ErrorLogsPageSkeleton'
import { PprCalendarPageSkeleton } from '@/features/ppr-calendar/ui/PprCalendarPageSkeleton'
import { ApplicationCalendarPageSkeleton } from '@/features/application-calendar/ui/ApplicationCalendarPageSkeleton'
import { SubmitApplicationPageSkeleton } from '@/features/application-submit/ui/SubmitApplicationPageSkeleton'
import { PprTypePageSkeleton } from '@/features/ppr-type/ui/PprTypePageSkeleton'
import { RolesPageSkeleton } from '@/features/roles/ui/RolesPageSkeleton'
import { StructuralUnitPageSkeleton } from '@/features/structural-unit/ui/StructuralUnitPageSkeleton'
import { ObjectPageSkeleton } from '@/features/object/ui/ObjectPageSkeleton'
import { UsersPageSkeleton } from '@/features/users/ui/UsersPageSkeleton'
import { RouteFallback } from '@/shared/ui/RouteFallback'

export const HomePage = lazy(() =>
  import('@/features/home/ui/HomePage').then((module) => ({
    default: module.HomePage,
  })),
)

export const UsersPage = lazy(() =>
  import('@/features/users/ui/UsersPage').then((module) => ({
    default: module.UsersPage,
  })),
)

export const EmployeesPage = lazy(() =>
  import('@/features/employees/ui/EmployeesPage').then((module) => ({
    default: module.EmployeesPage,
  })),
)

export const PprTypePage = lazy(() =>
  import('@/features/ppr-type/ui/PprTypePage').then((module) => ({
    default: module.PprTypePage,
  })),
)

export const StructuralUnitPage = lazy(() =>
  import('@/features/structural-unit/ui/StructuralUnitPage').then((module) => ({
    default: module.StructuralUnitPage,
  })),
)

export const ObjectPage = lazy(() =>
  import('@/features/object/ui/ObjectPage').then((module) => ({
    default: module.ObjectPage,
  })),
)

export const PlaceholderPage = lazy(() =>
  import('@/features/placeholder/ui/PlaceholderPage').then((module) => ({
    default: module.PlaceholderPage,
  })),
)

export const GuidePage = lazy(() =>
  import('@/features/guide/ui/GuidePage').then((module) => ({
    default: module.GuidePage,
  })),
)

export const ProfilePage = lazy(() =>
  import('@/features/profile/ui/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)

export const SettingsPage = lazy(() =>
  import('@/features/settings/ui/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const RolesPage = lazy(() =>
  import('@/features/roles/ui/RolesPage').then((module) => ({
    default: module.RolesPage,
  })),
)

export const SubmitApplicationPage = lazy(() =>
  import('@/features/application-submit/ui/SubmitApplicationPage').then((module) => ({
    default: module.SubmitApplicationPage,
  })),
)

export const IncomingApplicationPage = lazy(() =>
  import('@/features/application-submit/ui/IncomingApplicationPage').then((module) => ({
    default: module.IncomingApplicationPage,
  })),
)

export const ApplicationCalendarPage = lazy(() =>
  import('@/features/application-calendar/ui/ApplicationCalendarPage').then((module) => ({
    default: module.ApplicationCalendarPage,
  })),
)

export const PprCalendarPage = lazy(() =>
  import('@/features/ppr-calendar/ui/PprCalendarPage').then((module) => ({
    default: module.PprCalendarPage,
  })),
)

export const ApplicationWorkflowPage = lazy(() =>
  import('@/features/application-workflow/ui/ApplicationWorkflowPage').then((module) => ({
    default: module.ApplicationWorkflowPage,
  })),
)

export const ManagementPage = lazy(() =>
  import('@/features/management/ui/ManagementPage').then((module) => ({
    default: module.ManagementPage,
  })),
)

export const PprManagementPage = lazy(() =>
  import('@/features/ppr-management/ui/PprManagementPage').then((module) => ({
    default: module.PprManagementPage,
  })),
)

export const PprManagementMonthPage = lazy(() =>
  import('@/features/ppr-management/ui/PprManagementMonthPage').then((module) => ({
    default: module.PprManagementMonthPage,
  })),
)

export const ErrorLogsPage = lazy(() =>
  import('@/features/error-logs/ui/ErrorLogsPage').then((module) => ({
    default: module.ErrorLogsPage,
  })),
)

export function lazyRoute(element: ReactNode, fallback: ReactNode = <RouteFallback />) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export const usersRouteFallback = <UsersPageSkeleton />
export const pprTypeRouteFallback = <PprTypePageSkeleton />
export const structuralUnitRouteFallback = <StructuralUnitPageSkeleton />
export const objectRouteFallback = <ObjectPageSkeleton />
export const rolesRouteFallback = <RolesPageSkeleton />
export const submitApplicationRouteFallback = <SubmitApplicationPageSkeleton />
export const applicationCalendarRouteFallback = <ApplicationCalendarPageSkeleton />
export const pprCalendarRouteFallback = <PprCalendarPageSkeleton />
export const errorLogsRouteFallback = <ErrorLogsPageSkeleton />
