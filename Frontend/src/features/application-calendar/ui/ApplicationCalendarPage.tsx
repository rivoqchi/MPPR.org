import { useMemo } from 'react'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import {
  filterCalendarApplications,
  groupApplicationsByDeadline,
} from '@/features/application-calendar/lib/calendar-applications'
import { ApplicationCalendar } from '@/features/application-calendar/ui/ApplicationCalendar'
import { useApplicationsHydration } from '@/shared/hooks/useApplicationsHydration'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { ApplicationCalendarPageSkeleton } from '@/features/application-calendar/ui/ApplicationCalendarPageSkeleton'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

export function ApplicationCalendarPage() {
  const isApplicationsHydrated = useApplicationsHydration()
  const applications = useApplicationsStore((state) => state.applications)
  const { currentUser, canViewAll } = useStructuralUnitScope()

  const applicationsByDeadline = useMemo(() => {
    const scopedApplications = filterCalendarApplications(applications, currentUser, canViewAll)

    return groupApplicationsByDeadline(scopedApplications)
  }, [applications, canViewAll, currentUser])

  if (!isApplicationsHydrated) {
    return <ApplicationCalendarPageSkeleton />
  }

  return (
    <div
      style={{
        ...fullHeightPageStyle,
        width: '100%',
        height: '100%',
      }}
    >
      <ApplicationCalendar applicationsByDeadline={applicationsByDeadline} />
    </div>
  )
}
