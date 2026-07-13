import dayjs from 'dayjs'
import type { Application } from '@/entities/application/model/types'
import type { User } from '@/entities/user/model/types'

export function isExecutionApplicationWithDeadline(application: Application): boolean {
  return application.type === 'execution' && Boolean(application.deadline)
}

export function getApplicationDeadlineKey(deadline: string): string {
  return dayjs(deadline).startOf('day').format('YYYY-MM-DD')
}

export function filterCalendarApplications(
  applications: Application[],
  currentUser: User | null,
  canViewAll: boolean,
): Application[] {
  return applications.filter((application) => {
    if (!isExecutionApplicationWithDeadline(application)) {
      return false
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
    const existing = grouped.get(key) ?? []

    grouped.set(key, [...existing, application])
  }

  return grouped
}

export function getApplicationsForDate(
  applicationsByDeadline: Map<string, Application[]>,
  date: dayjs.Dayjs,
): Application[] {
  return applicationsByDeadline.get(date.startOf('day').format('YYYY-MM-DD')) ?? []
}
