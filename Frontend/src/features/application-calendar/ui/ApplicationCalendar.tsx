import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Badge, Checkbox, theme } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '@/entities/application/model/types'
import {
  buildMonthGrid,
  chunkMonthGridIntoWeeks,
  formatCalendarMonthTitle,
  getWeekdayLabels,
} from '@/features/application-calendar/lib/build-month-grid'
import {
  countApplicationsInMonth,
  getCalendarDayDotColors,
} from '@/features/application-calendar/lib/calendar-applications'
import { ApplicationCalendarDayCell } from '@/features/application-calendar/ui/ApplicationCalendarDayCell'
import { ApplicationCalendarDayPanel } from '@/features/application-calendar/ui/ApplicationCalendarDayPanel'
import { ApplicationCalendarExpandPanel } from '@/features/application-calendar/ui/ApplicationCalendarExpandPanel'
import { useUiStore } from '@/shared/stores/ui-store'

interface ApplicationCalendarProps {
  applicationsByDeadline: Map<string, Application[]>
  onlySubmittedByMe: boolean
  onOnlySubmittedByMeChange: (checked: boolean) => void
  value?: Dayjs
  onChange?: (date: Dayjs) => void
}

export function ApplicationCalendar({
  applicationsByDeadline,
  onlySubmittedByMe,
  onOnlySubmittedByMeChange,
  value,
  onChange,
}: ApplicationCalendarProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const locale = useUiStore((state) => state.locale)
  const [internalValue, setInternalValue] = useState(() => dayjs())
  const [visibleMonth, setVisibleMonth] = useState(() => dayjs().startOf('month'))
  const [openDateKey, setOpenDateKey] = useState<string | null>(null)
  const calendarBodyRef = useRef<HTMLDivElement>(null)
  const [weekRowHeight, setWeekRowHeight] = useState(0)
  const lockedWeekHeightRef = useRef(0)

  const selectedDate = value ?? internalValue
  const today = dayjs().startOf('day')
  const todayWeekday = today.day()

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(visibleMonth, (dayKey) => t(`applicationCalendar.weekdays.${dayKey}`)),
    [locale, t, visibleMonth],
  )
  const monthTitle = useMemo(
    () =>
      formatCalendarMonthTitle(visibleMonth, (monthIndex) =>
        t(`applicationCalendar.months.${monthIndex}`),
      ),
    [locale, t, visibleMonth],
  )
  const monthDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth])
  const weeks = useMemo(() => chunkMonthGridIntoWeeks(monthDays), [monthDays])

  const monthEventCount = useMemo(
    () => countApplicationsInMonth(applicationsByDeadline, visibleMonth),
    [applicationsByDeadline, visibleMonth],
  )

  const dayMetaByKey = useMemo(() => {
    const meta = new Map<string, { count: number; dotColors: string[] }>()

    for (const [key, applications] of applicationsByDeadline) {
      meta.set(key, {
        count: applications.length,
        dotColors: getCalendarDayDotColors(applications),
      })
    }

    return meta
  }, [applicationsByDeadline])

  const openApplications = useMemo(() => {
    if (!openDateKey) {
      return []
    }

    return applicationsByDeadline.get(openDateKey) ?? []
  }, [applicationsByDeadline, openDateKey])

  const [panelApplications, setPanelApplications] = useState<Application[]>([])

  useEffect(() => {
    if (openApplications.length > 0) {
      setPanelApplications(openApplications)
    }
  }, [openApplications])

  const openWeekIndex = useMemo(() => {
    if (!openDateKey) {
      return -1
    }

    return weeks.findIndex((week) =>
      week.some((date) => date.format('YYYY-MM-DD') === openDateKey),
    )
  }, [openDateKey, weeks])

  useEffect(() => {
    const body = calendarBodyRef.current

    if (!body) {
      return
    }

    const updateWeekHeight = () => {
      const nextHeight = Math.floor(body.clientHeight / 6)

      if (nextHeight <= 0) {
        return
      }

      // Panel ochiq bo'lganda o'lchamni qulflash — kalendar siqilmasin
      if (openDateKey) {
        return
      }

      lockedWeekHeightRef.current = nextHeight
      setWeekRowHeight(nextHeight)
    }

    updateWeekHeight()

    const observer = new ResizeObserver(() => {
      updateWeekHeight()
    })

    observer.observe(body)

    return () => observer.disconnect()
  }, [openDateKey])

  const weekDayGridHeight = Math.max(
    openDateKey ? lockedWeekHeightRef.current || weekRowHeight : weekRowHeight,
    72,
  )

  const handleSelectDate = (date: Dayjs) => {
    const normalized = date.startOf('day')
    const key = normalized.format('YYYY-MM-DD')
    const dayMeta = dayMetaByKey.get(key)

    if (!value) {
      setInternalValue(normalized)
    }

    onChange?.(normalized)

    if (!dayMeta || dayMeta.count === 0) {
      setOpenDateKey(null)
      return
    }

    setOpenDateKey((current) => (current === key ? null : key))
  }

  const handleVisibleMonthChange = (nextMonth: Dayjs) => {
    setVisibleMonth(nextMonth.startOf('month'))
    setOpenDateKey(null)
  }

  const handleToday = () => {
    const now = dayjs()

    handleVisibleMonthChange(now.startOf('month'))
    handleSelectDate(now)
  }

  const handleCloseDayPanel = () => {
    setOpenDateKey(null)
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
            count={monthEventCount}
            showZero
            overflowCount={999}
            style={{ backgroundColor: token.colorPrimary }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <Checkbox
            checked={onlySubmittedByMe}
            onChange={(event) => onOnlySubmittedByMeChange(event.target.checked)}
          >
            {t('applicationCalendar.onlySubmittedByMe')}
          </Checkbox>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              style={navButtonStyle}
              onClick={() => handleVisibleMonthChange(visibleMonth.subtract(1, 'month'))}
              aria-label={t('applicationCalendar.previousMonth')}
            >
              <LeftOutlined />
            </button>
            <button
              type="button"
              style={navButtonStyle}
              onClick={handleToday}
              aria-label={t('applicationCalendar.today')}
            >
              <CalendarOutlined />
            </button>
            <button
              type="button"
              style={navButtonStyle}
              onClick={() => handleVisibleMonthChange(visibleMonth.add(1, 'month'))}
              aria-label={t('applicationCalendar.nextMonth')}
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
            overflow: 'auto',
          }}
        >
          {weeks.map((week, weekIndex) => {
            const isPanelOpen = openWeekIndex === weekIndex

            return (
              <div
                key={week[0]?.format('YYYY-MM-DD') ?? weekIndex}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '0 0 auto',
                }}
              >
                <div
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
                    const isSelected = normalizedDate.isSame(selectedDate.startOf('day'), 'day')
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
                        selectedBg={token.colorSuccessBg}
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

                <ApplicationCalendarExpandPanel
                  open={isPanelOpen}
                  borderColor={token.colorPrimary}
                  background={token.colorBgContainer}
                  boxShadow={token.boxShadowTertiary}
                >
                  <ApplicationCalendarDayPanel
                    applications={
                      openApplications.length > 0 ? openApplications : panelApplications
                    }
                    onClose={handleCloseDayPanel}
                  />
                </ApplicationCalendarExpandPanel>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
