import dayjs from 'dayjs'
import type { Application, ApplicationStatus } from '@/entities/application/model/types'
import type { User } from '@/entities/user/model/types'

export const CALENDAR_MAX_STATUS_DOTS = 5

export function isExecutionApplicationWithDeadline(application: Application): boolean {
  return application.type === 'execution' && Boolean(application.deadline)
}

export function getApplicationDeadlineKey(deadline: string): string {
  return dayjs(deadline).startOf('day').format('YYYY-MM-DD')
}

export function isApplicationSubmittedByUser(
  application: Application,
  userId: string | undefined,
): boolean {
  return Boolean(userId) && application.createdByUserId === userId
}

export function filterCalendarApplications(
  applications: Application[],
  currentUser: User | null,
  canViewAll: boolean,
  options?: { onlySubmittedByMe?: boolean },
): Application[] {
  return applications.filter((application) => {
    if (!isExecutionApplicationWithDeadline(application)) {
      return false
    }

    if (options?.onlySubmittedByMe) {
      return isApplicationSubmittedByUser(application, currentUser?.id)
    }

    if (canViewAll) {
      return true
    }

    return application.createdByUserId === currentUser?.id
  })
}

export function groupApplicationsByDeadline(
  applications: Application[],
): Map<string, Application[]> {
  const grouped = new Map<string, Application[]>()

  for (const application of applications) {
    if (!application.deadline) {
      continue
    }

    const key = getApplicationDeadlineKey(application.deadline)
    const existing = grouped.get(key)

    if (existing) {
      existing.push(application)
    } else {
      grouped.set(key, [application])
    }
  }

  return grouped
}

export function getApplicationsForDate(
  applicationsByDeadline: Map<string, Application[]>,
  date: dayjs.Dayjs,
): Application[] {
  return applicationsByDeadline.get(date.startOf('day').format('YYYY-MM-DD')) ?? []
}

export function getApplicationStatusDotColor(status: ApplicationStatus): string {
  switch (status) {
    case 'completed':
      return '#1677ff'
    case 'cancelled':
      return '#8c8c8c'
    case 'in_progress':
    default:
      return '#8b5a2b'
  }
}

export function getCalendarDayDotColors(applications: Application[]): string[] {
  return applications
    .slice(0, CALENDAR_MAX_STATUS_DOTS)
    .map((application) => getApplicationStatusDotColor(application.status))
}

export function countApplicationsInMonth(
  applicationsByDeadline: Map<string, Application[]>,
  visibleMonth: dayjs.Dayjs,
): number {
  const monthPrefix = visibleMonth.format('YYYY-MM')
  let total = 0

  for (const [key, applications] of applicationsByDeadline) {
    if (key.startsWith(monthPrefix)) {
      total += applications.length
    }
  }

  return total
}
