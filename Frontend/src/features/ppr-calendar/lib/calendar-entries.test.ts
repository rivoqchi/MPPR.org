import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import {
  buildExecutionTimelineSteps,
  canClearPprCalendarMonth,
  canExecutePprDate,
  canSubmitPprCalendarMonth,
  findPendingMonthForView,
  getDayCompletionPercent,
  getEntryCompletionPercent,
  groupEntriesByDate,
  isPprExecutionOverdue,
  isStructuralUnitHead,
  viewScopeToEntryFormScope,
} from '@/features/ppr-calendar/lib/calendar-entries'
import type { PprCalendarMonth } from '@/entities/ppr-calendar/model/types'

const baseEntry: PprCalendarEntry = {
  id: 'entry-1',
  monthId: 'month-1',
  date: '2026-07-15',
  pprTypeId: 'ppr-1',
  objectIds: ['obj-1'],
  scopeType: 'structure',
  comment: '',
  createdByUserId: 'user-1',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

describe('groupEntriesByDate', () => {
  it('groups entries by date key', () => {
    const grouped = groupEntriesByDate([
      baseEntry,
      { ...baseEntry, id: 'entry-2', date: '2026-07-16' },
      { ...baseEntry, id: 'entry-3', date: '2026-07-15' },
    ])

    expect(grouped.get('2026-07-15')).toHaveLength(2)
    expect(grouped.get('2026-07-16')).toHaveLength(1)
  })
})

describe('canSubmitPprCalendarMonth', () => {
  it('allows submit only for draft months with entries and create permission', () => {
    expect(canSubmitPprCalendarMonth('draft', true, 2)).toBe(true)
    expect(canSubmitPprCalendarMonth('pending_approval', true, 2)).toBe(false)
    expect(canSubmitPprCalendarMonth('draft', false, 2)).toBe(false)
    expect(canSubmitPprCalendarMonth('draft', true, 0)).toBe(false)
  })
})

describe('canClearPprCalendarMonth', () => {
  it('allows clear only for draft months with entries and saved month id', () => {
    expect(canClearPprCalendarMonth('draft', true, 2, true)).toBe(true)
    expect(canClearPprCalendarMonth('draft', true, 2, false)).toBe(false)
    expect(canClearPprCalendarMonth('pending_approval', true, 2, true)).toBe(false)
    expect(canClearPprCalendarMonth('draft', false, 2, true)).toBe(false)
    expect(canClearPprCalendarMonth('draft', true, 0, true)).toBe(false)
  })
})

describe('isStructuralUnitHead', () => {
  it('detects head by headUserId', () => {
    expect(
      isStructuralUnitHead(
        'user-head',
        { headUserId: 'user-head', headFullName: 'Ali Valiyev' },
        [],
      ),
    ).toBe(true)
  })
})

describe('findPendingMonthForView', () => {
  const pendingMonths: PprCalendarMonth[] = [
    {
      id: 'month-1',
      structuralUnitId: 'unit-1',
      year: 2026,
      month: 8,
      status: 'pending_approval',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      entries: [baseEntry],
    },
  ]

  it('finds pending month for matching unit and period', () => {
    expect(findPendingMonthForView(pendingMonths, 'unit-1', 2026, 8)).toEqual(pendingMonths[0])
  })

  it('returns undefined when no pending month matches', () => {
    expect(findPendingMonthForView(pendingMonths, 'unit-1', 2026, 7)).toBeUndefined()
  })
})

describe('viewScopeToEntryFormScope', () => {
  it('maps structure scope', () => {
    expect(viewScopeToEntryFormScope({ type: 'structure' })).toEqual({
      scopeType: 'structure',
      entrySectionId: undefined,
    })
  })

  it('maps section scope', () => {
    expect(viewScopeToEntryFormScope({ type: 'section', sectionId: 'section-1' })).toEqual({
      scopeType: 'section',
      entrySectionId: 'section-1',
    })
  })

  it('defaults missing scope to structure', () => {
    expect(viewScopeToEntryFormScope(undefined)).toEqual({
      scopeType: 'structure',
      entrySectionId: undefined,
    })
  })
})

describe('canExecutePprDate', () => {
  it('allows today and any past date, blocks future', () => {
    const today = dayjs('2026-07-13')

    expect(canExecutePprDate('2026-07-13', today)).toBe(true)
    expect(canExecutePprDate('2026-07-12', today)).toBe(true)
    expect(canExecutePprDate('2026-07-01', today)).toBe(true)
    expect(canExecutePprDate('2026-07-14', today)).toBe(false)
  })
})

describe('isPprExecutionOverdue', () => {
  it('marks dates older than planned+3 days as overdue', () => {
    const today = dayjs('2026-07-21')

    expect(isPprExecutionOverdue('2026-07-21', today)).toBe(false)
    expect(isPprExecutionOverdue('2026-07-18', today)).toBe(false)
    expect(isPprExecutionOverdue('2026-07-17', today)).toBe(true)
    expect(isPprExecutionOverdue('2026-07-10', today)).toBe(true)
  })
})

describe('completion helpers', () => {
  const entry: PprCalendarEntry = {
    ...baseEntry,
    objectIds: ['obj-1', 'obj-2'],
    executions: [
      {
        id: 'exec-1',
        entryId: 'entry-1',
        objectId: 'obj-1',
        images: [],
        files: [],
        comment: '',
        executedByUserId: 'user-1',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ],
  }

  it('calculates entry and day completion percent', () => {
    expect(getEntryCompletionPercent(entry)).toBe(50)
    expect(getDayCompletionPercent([entry])).toBe(50)
  })
})

describe('buildExecutionTimelineSteps', () => {
  it('groups executions by batch and tracks cumulative percent', () => {
    const timelineEntry: PprCalendarEntry = {
      ...baseEntry,
      objectIds: ['obj-1', 'obj-2', 'obj-3'],
      executions: [
        {
          id: 'exec-1',
          entryId: 'entry-1',
          objectId: 'obj-1',
          images: [],
          files: [],
          comment: 'Birinchi qadam',
          executedByUserId: 'user-1',
          createdAt: '2026-07-01T10:00:00.000Z',
          updatedAt: '2026-07-01T10:00:00.000Z',
        },
        {
          id: 'exec-2',
          entryId: 'entry-1',
          objectId: 'obj-2',
          images: [],
          files: [],
          comment: 'Ikkinchi qadam',
          executedByUserId: 'user-1',
          createdAt: '2026-07-02T10:00:00.000Z',
          updatedAt: '2026-07-02T10:00:00.000Z',
        },
        {
          id: 'exec-3',
          entryId: 'entry-1',
          objectId: 'obj-3',
          images: [],
          files: [],
          comment: 'Yakun',
          executedByUserId: 'user-1',
          createdAt: '2026-07-03T10:00:00.000Z',
          updatedAt: '2026-07-03T10:00:00.000Z',
        },
      ],
    }

    const steps = buildExecutionTimelineSteps(timelineEntry)

    expect(steps).toHaveLength(3)
    expect(steps[0]?.completionPercent).toBe(33)
    expect(steps[1]?.completionPercent).toBe(67)
    expect(steps[2]?.completionPercent).toBe(100)
    expect(steps[2]?.isCompleted).toBe(true)
  })
})
