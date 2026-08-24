import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry, PprCalendarMonth } from '@/entities/ppr-calendar/model/types'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import {
  buildMonthGrid,
  formatCalendarMonthTitle,
  getWeekdayLabels,
} from '@/features/application-calendar/lib/build-month-grid'
import {
  getEntryCompletionPercent,
  getEntriesForDate,
  groupEntriesByDate,
  isPprExecutionOverdue,
} from '@/features/ppr-calendar/lib/calendar-entries'

interface PprCalendarProps {
  month: PprCalendarMonth | null
  visibleMonth: Dayjs
  onVisibleMonthChange: (month: Dayjs) => void
  isEditable: boolean
  canSubmit: boolean
  canClear: boolean
  showExecutionProgress: boolean
  isMoveMode?: boolean
  movingEntryId?: string | null
  onDateClick: (date: Dayjs) => void
  onEntryClick: (entry: PprCalendarEntry) => void
  onSubmitMonth: () => void
  onClearMonth: () => void
}

function truncateText(text: string, maxLength = 22): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}…`
}

export function PprCalendar({
  month,
  visibleMonth,
  onVisibleMonthChange,
  isEditable,
  canSubmit,
  canClear,
  showExecutionProgress,
  isMoveMode = false,
  movingEntryId = null,
  onDateClick,
  onEntryClick,
  onSubmitMonth,
  onClearMonth,
}: PprCalendarProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const pprTypes = usePprTypesStore((state) => state.pprTypes)
  const today = dayjs().startOf('day')

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

  const entriesByDate = useMemo(
    () => groupEntriesByDate(month?.entries ?? []),
    [month?.entries],
  )

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
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
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
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 16,
            padding: '16px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorFillAlter,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              icon={<LeftOutlined />}
              onClick={() => onVisibleMonthChange(visibleMonth.subtract(1, 'month'))}
              aria-label={t('pprCalendar.previousMonth')}
            />
            <Button onClick={() => onVisibleMonthChange(dayjs().startOf('month'))}>
              {t('pprCalendar.today')}
            </Button>
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.2,
              textAlign: 'center',
              color: token.colorText,
              textTransform: 'capitalize',
            }}
          >
            {monthTitle}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
            {canClear ? (
              <Button danger onClick={onClearMonth}>
                {t('pprCalendar.actions.clearMonth')}
              </Button>
            ) : null}
            {canSubmit ? (
              <Button type="primary" onClick={onSubmitMonth}>
                {t('pprCalendar.actions.submitMonth')}
              </Button>
            ) : null}
            <Button
              icon={<RightOutlined />}
              onClick={() => onVisibleMonthChange(visibleMonth.add(1, 'month'))}
              aria-label={t('pprCalendar.nextMonth')}
            />
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
              background: token.colorFillQuaternary,
            }}
          >
            {weekdayLabels.map((label, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: token.colorTextSecondary,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(6, minmax(0, 1fr))',
            }}
          >
            {monthDays.map((date) => {
              const normalizedDate = date.startOf('day')
              const dateKey = normalizedDate.format('YYYY-MM-DD')
              const dayEntries = getEntriesForDate(entriesByDate, dateKey)
              const isCurrentMonth = normalizedDate.month() === visibleMonth.month()
              const isToday = normalizedDate.isSame(today, 'day')
              const isWeekend = normalizedDate.day() === 0 || normalizedDate.day() === 6

              return (
                <div
                  key={normalizedDate.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => onDateClick(normalizedDate)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onDateClick(normalizedDate)
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 0,
                    border: 'none',
                    borderRight: `1px solid ${token.colorBorderSecondary}`,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    margin: 0,
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                    gap: 6,
                    cursor: isEditable || dayEntries.length > 0 ? 'pointer' : 'default',
                    textAlign: 'left',
                    overflow: 'hidden',
                    background: isToday
                      ? token.colorInfoBg
                      : isWeekend
                        ? token.colorFillAlter
                        : token.colorBgContainer,
                    color: isCurrentMonth ? token.colorText : token.colorTextQuaternary,
                    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'flex-start',
                      fontSize: 15,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? token.colorInfoText : isCurrentMonth ? token.colorText : token.colorTextQuaternary,
                      background: isToday ? token.colorInfoBg : 'transparent',
                      border: isToday ? `1px solid ${token.colorInfoBorder}` : 'none',
                      flexShrink: 0,
                    }}
                  >
                    {normalizedDate.date()}
                  </span>

                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                    }}
                  >
                    {dayEntries.map((entry) => {
                      const pprType = pprTypes.find((item) => item.id === entry.pprTypeId)
                      const label = pprType?.shortName ?? entry.pprTypeId
                      const entryPercent = showExecutionProgress
                        ? getEntryCompletionPercent(entry)
                        : null
                      const isOverdue =
                        showExecutionProgress && isPprExecutionOverdue(entry.date)
                      const chipBackground = isOverdue
                        ? token.colorErrorBg
                        : token.colorPrimaryBg
                      const chipColor = isOverdue
                        ? token.colorErrorText
                        : token.colorPrimaryText

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onEntryClick(entry)
                          }}
                          title={entry.comment || label}
                          style={{
                            width: '100%',
                            border:
                              movingEntryId === entry.id
                                ? `1px solid ${token.colorPrimary}`
                                : isOverdue
                                  ? `1px solid ${token.colorErrorBorder}`
                                  : 'none',
                            borderRadius: token.borderRadiusSM,
                            margin: 0,
                            padding: '3px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                            cursor: 'pointer',
                            background:
                              movingEntryId === entry.id
                                ? token.colorPrimaryBorderHover
                                : chipBackground,
                            color: chipColor,
                            fontSize: 11,
                            fontWeight: 600,
                            lineHeight: 1.3,
                            minWidth: 0,
                            boxShadow:
                              isMoveMode && movingEntryId === entry.id
                                ? `0 0 0 1px ${token.colorPrimaryBorder}`
                                : 'none',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                              flex: 1,
                              textAlign: 'left',
                            }}
                          >
                            {truncateText(label)}
                          </span>
                          {entryPercent !== null ? (
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: 10,
                                fontWeight: 700,
                                color: isOverdue
                                  ? token.colorError
                                  : entryPercent === 100
                                    ? token.colorSuccess
                                    : entryPercent > 0
                                      ? token.colorPrimary
                                      : token.colorTextSecondary,
                              }}
                            >
                              {entryPercent}%
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
