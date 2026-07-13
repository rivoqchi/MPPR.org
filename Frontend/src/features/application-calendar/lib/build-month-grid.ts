import dayjs, { type Dayjs } from 'dayjs'

export const CALENDAR_GRID_SIZE = 42

export const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

export function buildMonthGrid(visibleMonth: Dayjs): Dayjs[] {
  const start = visibleMonth.startOf('month').startOf('week')

  return Array.from({ length: CALENDAR_GRID_SIZE }, (_, index) => start.add(index, 'day'))
}

export function getWeekdayLabels(
  referenceDate: Dayjs,
  getLabel: (dayKey: WeekdayKey) => string,
): string[] {
  const start = referenceDate.startOf('week')

  return Array.from({ length: 7 }, (_, index) => {
    const dayKey = WEEKDAY_KEYS[start.add(index, 'day').day()]!

    return getLabel(dayKey)
  })
}

export function formatCalendarMonthTitle(
  visibleMonth: Dayjs,
  getMonthLabel: (monthIndex: number) => string,
): string {
  return `${getMonthLabel(visibleMonth.month())} ${visibleMonth.year()}`
}
