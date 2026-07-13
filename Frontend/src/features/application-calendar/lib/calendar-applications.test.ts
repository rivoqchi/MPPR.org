import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { Application } from '@/entities/application/model/types'
import type { User } from '@/entities/user/model/types'
import {
  filterCalendarApplications,
  getApplicationDeadlineKey,
  getApplicationsForDate,
  groupApplicationsByDeadline,
  isExecutionApplicationWithDeadline,
} from '@/features/application-calendar/lib/calendar-applications'

const currentUser = {
  id: 'user-1',
} as User

const baseApplication: Application = {
  id: 'app-1',
  structuralUnitIds: ['unit-a'],
  type: 'execution',
  status: 'in_progress',
  workflowStatus: 'in_progress_work',
  deadline: '2026-07-15T00:00:00.000Z',
  images: [],
  files: [],
  comment: 'Test application',
  specialMessages: [],
  confirmationFiles: [],
  workflowUnitStatuses: [],
  createdByUserId: 'user-1',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

describe('calendar applications', () => {
  it('detects execution applications with deadline', () => {
    expect(isExecutionApplicationWithDeadline(baseApplication)).toBe(true)
    expect(
      isExecutionApplicationWithDeadline({
        ...baseApplication,
        type: 'information',
      }),
    ).toBe(false)
  })

  it('filters applications by submit scope', () => {
    const applications = [
      baseApplication,
      {
        ...baseApplication,
        id: 'app-2',
        createdByUserId: 'user-2',
      },
    ]

    const scoped = filterCalendarApplications(applications, currentUser, false)

    expect(scoped).toHaveLength(1)
    expect(scoped[0]?.id).toBe('app-1')
  })

  it('groups applications by deadline date', () => {
    const grouped = groupApplicationsByDeadline([
      baseApplication,
      {
        ...baseApplication,
        id: 'app-2',
        deadline: '2026-07-15T12:00:00.000Z',
      },
      {
        ...baseApplication,
        id: 'app-3',
        deadline: '2026-07-20T00:00:00.000Z',
      },
    ])

    expect(grouped.get(getApplicationDeadlineKey('2026-07-15'))).toHaveLength(2)
    expect(grouped.get(getApplicationDeadlineKey('2026-07-20'))).toHaveLength(1)
  })

  it('returns applications for a specific calendar date', () => {
    const grouped = groupApplicationsByDeadline([baseApplication])

    expect(getApplicationsForDate(grouped, dayjs('2026-07-15'))).toHaveLength(1)
    expect(getApplicationsForDate(grouped, dayjs('2026-07-16'))).toHaveLength(0)
  })
})
