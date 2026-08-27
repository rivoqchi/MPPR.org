import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Badge, Button, theme } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarMonth } from '@/entities/ppr-calendar/model/types'
import {
  buildMonthGrid,
  chunkMonthGridIntoWeeks,
  formatCalendarMonthTitle,
  getWeekdayLabels,
} from '@/features/application-calendar/lib/build-month-grid'
import { ApplicationCalendarDayCell } from '@/features/application-calendar/ui/ApplicationCalendarDayCell'
import {
  getEntriesForDate,
  getPprDayDotColors,
  groupEntriesByDate,
} from '@/features/ppr-calendar/lib/calendar-entries'

interface PprCalendarProps {
  month: PprCalendarMonth | null
  visibleMonth: Dayjs
  onVisibleMonthChange: (month: Dayjs) => void
  selectedDate?: Dayjs | null
  isEditable: boolean
  canSubmit: boolean
  canClear: boolean
  showExecutionProgress: boolean
  isMoveMode?: boolean
  movingEntryId?: string | null
  onDateClick: (date: Dayjs) => void
  onSubmitMonth: () => void
  onClearMonth: () => void
}

export function PprCalendar({
  month,
  visibleMonth,
  onVisibleMonthChange,
  selectedDate = null,
  isEditable,
  canSubmit,
  canClear,
  showExecutionProgress,
  isMoveMode = false,
  movingEntryId = null,
  onDateClick,
  onSubmitMonth,
  onClearMonth,
}: PprCalendarProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const today = dayjs().startOf('day')
  const todayWeekday = today.day()
  const calendarBodyRef = useRef<HTMLDivElement>(null)
  const [weekRowHeight, setWeekRowHeight] = useState(0)

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(visibleMonth, (dayKey) => t(`pprCalendar.weekdays.${dayKey}`)),
    [t, visibleMonth],
  )

  const monthTitle = useMemo(
    () =>
      formatCalendarMonthTitle(visibleMonth, (monthIndex) =>
        t(`pprCalendar.months.${monthIndex}`),
      ),
    [t, visibleMonth],
  )

  const monthDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth])
  const weeks = useMemo(() => chunkMonthGridIntoWeeks(monthDays), [monthDays])

  const entriesByDate = useMemo(
    () => groupEntriesByDate(month?.entries ?? []),
    [month?.entries],
  )

  const monthEntryCount = month?.entries.length ?? 0

  const dayMetaByKey = useMemo(() => {
    const meta = new Map<string, { count: number; dotColors: string[] }>()

    for (const [key, entries] of entriesByDate) {
      meta.set(key, {
        count: entries.length,
        dotColors: getPprDayDotColors(entries, { showExecutionProgress }),
      })
    }

    return meta
  }, [entriesByDate, showExecutionProgress])

  const movingEntryDateKey = useMemo(() => {
    if (!movingEntryId || !month) {
      return null
    }

    return month.entries.find((entry) => entry.id === movingEntryId)?.date ?? null
  }, [month, movingEntryId])

  useEffect(() => {
    const body = calendarBodyRef.current

    if (!body) {
      return
    }

    const updateWeekHeight = () => {
      const nextHeight = Math.floor(body.clientHeight / 6)

      if (nextHeight > 0) {
        setWeekRowHeight(nextHeight)
      }
    }

    updateWeekHeight()

    const observer = new ResizeObserver(updateWeekHeight)
    observer.observe(body)

    return () => observer.disconnect()
  }, [])

  const weekDayGridHeight = Math.max(weekRowHeight, 72)

  const handleSelectDate = (date: Dayjs) => {
    const normalized = date.startOf('day')
    const dateKey = normalized.format('YYYY-MM-DD')
    const dayEntries = getEntriesForDate(entriesByDate, dateKey)

    if (!isEditable && dayEntries.length === 0 && !isMoveMode) {
      return
    }

    onDateClick(normalized)
  }

  const navButtonStyle = {
    width: 32,
    height: 32,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: token.colorTextSecondary,
    cursor: 'pointer',
    borderRadius: token.borderRadiusSM,
  } as const

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.2,
              color: token.colorText,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {monthTitle}
          </div>
          <Badge
            count={monthEntryCount}
            showZero
            overflowCount={999}
            style={{ backgroundColor: token.colorPrimary }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {canClear ? (
            <Button danger size="small" onClick={onClearMonth}>
              {t('pprCalendar.actions.clearMonth')}
            </Button>
          ) : null}
          {canSubmit ? (
            <Button type="primary" size="small" onClick={onSubmitMonth}>
              {t('pprCalendar.actions.submitMonth')}
            </Button>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              style={navButtonStyle}
              onClick={() => onVisibleMonthChange(visibleMonth.subtract(1, 'month'))}
              aria-label={t('pprCalendar.previousMonth')}
            >
              <LeftOutlined />
            </button>
            <button
              type="button"
              style={navButtonStyle}
              onClick={() => onVisibleMonthChange(dayjs().startOf('month'))}
              aria-label={t('pprCalendar.today')}
            >
              <CalendarOutlined />
            </button>
            <button
              type="button"
              style={navButtonStyle}
              onClick={() => onVisibleMonthChange(visibleMonth.add(1, 'month'))}
              aria-label={t('pprCalendar.nextMonth')}
            >
              <RightOutlined />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {weekdayLabels.map((label, index) => {
            const weekdayIndex = monthDays[index]?.day() ?? index
            const isTodayColumn = weekdayIndex === todayWeekday

            return (
              <div
                key={index}
                style={{
                  padding: '10px 8px',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  textTransform: 'lowercase',
                  color: token.colorTextSecondary,
                  background: isTodayColumn ? token.colorFillQuaternary : 'transparent',
                  borderRight: index < 6 ? `1px solid ${token.colorBorderSecondary}` : undefined,
                }}
              >
                {label}
              </div>
            )
          })}
        </div>

        <div
          ref={calendarBodyRef}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {weeks.map((week, weekIndex) => (
            <div
              key={week[0]?.format('YYYY-MM-DD') ?? weekIndex}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                height: weekDayGridHeight,
                flexShrink: 0,
              }}
            >
              {week.map((date) => {
                const normalizedDate = date.startOf('day')
                const dateKey = normalizedDate.format('YYYY-MM-DD')
                const dayMeta = dayMetaByKey.get(dateKey)
                const isCurrentMonth = normalizedDate.month() === visibleMonth.month()
                const isToday = normalizedDate.isSame(today, 'day')
                const isSelected =
                  Boolean(selectedDate?.isSame(normalizedDate, 'day')) ||
                  movingEntryDateKey === dateKey
                const isWeekend = normalizedDate.day() === 0 || normalizedDate.day() === 6
                const isTodayColumn = normalizedDate.day() === todayWeekday

                return (
                  <ApplicationCalendarDayCell
                    key={dateKey}
                    date={normalizedDate}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    isSelected={isSelected}
                    isWeekend={isWeekend}
                    isTodayColumn={isTodayColumn && !isSelected}
                    count={dayMeta?.count ?? 0}
                    dotColors={dayMeta?.dotColors ?? []}
                    borderColor={token.colorBorderSecondary}
                    selectedBg={
                      isMoveMode && movingEntryDateKey === dateKey
                        ? token.colorPrimaryBg
                        : token.colorSuccessBg
                    }
                    todayColumnBg={token.colorFillQuaternary}
                    weekendNumberColor={token.colorErrorText}
                    mutedTextColor={token.colorTextQuaternary}
                    textColor={token.colorTextSecondary}
                    badgeBg={token.colorPrimary}
                    onSelect={handleSelectDate}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
