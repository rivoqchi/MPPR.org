import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { Application } from '@/entities/application/model/types'
import type { User } from '@/entities/user/model/types'
import {
  countApplicationsInMonth,
  filterCalendarApplications,
  getApplicationDeadlineKey,
  getApplicationStatusDotColor,
  getApplicationsForDate,
  getCalendarDayDotColors,
  groupApplicationsByDeadline,
  isApplicationSubmittedByUser,
  isExecutionApplicationWithDeadline,
} from '@/features/application-calendar/lib/calendar-applications'

const currentUser = {
  id: 'user-1',
} as User

const baseApplication: Application = {
  id: 'app-1',
  submissionMode: 'combined',
  recipientUserIds: [],
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
  workflowAssignments: [],
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

  it('filters applications submitted by the current user', () => {
    const applications = [
      baseApplication,
      {
        ...baseApplication,
        id: 'app-other',
        createdByUserId: 'user-2',
      },
      {
        ...baseApplication,
        id: 'app-mine-too',
        createdByUserId: 'user-1',
        deadline: '2026-07-20T00:00:00.000Z',
      },
    ]

    expect(isApplicationSubmittedByUser(applications[0]!, 'user-1')).toBe(true)
    expect(isApplicationSubmittedByUser(applications[1]!, 'user-1')).toBe(false)

    const scoped = filterCalendarApplications(applications, currentUser, true, {
      onlySubmittedByMe: true,
    })

    expect(scoped.map((item) => item.id)).toEqual(['app-1', 'app-mine-too'])
  })

  it('builds status dots and month totals for calendar cells', () => {
    const applications = [
      baseApplication,
      {
        ...baseApplication,
        id: 'app-2',
        status: 'completed' as const,
        deadline: '2026-07-20T00:00:00.000Z',
      },
      {
        ...baseApplication,
        id: 'app-3',
        deadline: '2026-08-01T00:00:00.000Z',
      },
    ]
    const grouped = groupApplicationsByDeadline(applications)

    expect(getApplicationStatusDotColor('in_progress')).toBe('#8b5a2b')
    expect(getCalendarDayDotColors([applications[0]!, applications[1]!])).toEqual([
      '#8b5a2b',
      '#1677ff',
    ])
    expect(countApplicationsInMonth(grouped, dayjs('2026-07-01'))).toBe(2)
    expect(countApplicationsInMonth(grouped, dayjs('2026-08-01'))).toBe(1)
  })
})
