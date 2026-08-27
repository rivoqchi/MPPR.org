import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import {
  buildMonthGrid,
  CALENDAR_GRID_SIZE,
  chunkMonthGridIntoWeeks,
  formatCalendarMonthTitle,
  getWeekdayLabels,
} from '@/features/application-calendar/lib/build-month-grid'

const weekdayLabels: Record<string, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
}

const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

describe('buildMonthGrid', () => {
  it('returns 42 days for a month view', () => {
    const grid = buildMonthGrid(dayjs('2026-07-01'))

    expect(grid).toHaveLength(CALENDAR_GRID_SIZE)
  })

  it('starts on the first day of the calendar week containing the month', () => {
    const visibleMonth = dayjs('2026-07-01')
    const grid = buildMonthGrid(visibleMonth)

    expect(grid[0]?.isSame(visibleMonth.startOf('month').startOf('week'), 'day')).toBe(true)
  })

  it('returns seven localized weekday labels', () => {
    expect(getWeekdayLabels(dayjs('2026-07-01'), (dayKey) => weekdayLabels[dayKey]!)).toHaveLength(7)
  })

  it('formats month title with localized month name', () => {
    expect(
      formatCalendarMonthTitle(dayjs('2026-07-01'), (monthIndex) => monthLabels[monthIndex]!),
    ).toBe('July 2026')
  })

  it('chunks the month grid into six weeks of seven days', () => {
    const weeks = chunkMonthGridIntoWeeks(buildMonthGrid(dayjs('2026-08-01')))

    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })
})
