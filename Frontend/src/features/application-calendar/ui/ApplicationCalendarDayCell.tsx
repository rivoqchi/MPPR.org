import { memo } from 'react'
import type { Dayjs } from 'dayjs'

export interface ApplicationCalendarDayCellProps {
  date: Dayjs
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isWeekend: boolean
  isTodayColumn: boolean
  count: number
  dotColors: string[]
  borderColor: string
  selectedBg: string
  todayColumnBg: string
  weekendNumberColor: string
  mutedTextColor: string
  textColor: string
  badgeBg: string
  onSelect: (date: Dayjs) => void
}

export const ApplicationCalendarDayCell = memo(function ApplicationCalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  isWeekend,
  isTodayColumn,
  count,
  dotColors,
  borderColor,
  selectedBg,
  todayColumnBg,
  weekendNumberColor,
  mutedTextColor,
  textColor,
  badgeBg,
  onSelect,
}: ApplicationCalendarDayCellProps) {
  const dayNumber = date.date()
  const numberColor = !isCurrentMonth
    ? mutedTextColor
    : isWeekend
      ? weekendNumberColor
      : textColor

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={date.format('YYYY-MM-DD')}
      aria-pressed={isSelected}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        margin: 0,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 6,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        border: 'none',
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        background: isSelected ? selectedBg : isTodayColumn ? todayColumnBg : 'transparent',
        transition: 'background-color 0.15s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 6,
          minHeight: 22,
        }}
      >
        {count > 0 ? (
          <span
            style={{
              minWidth: 20,
              height: 20,
              paddingInline: 5,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: badgeBg,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        ) : (
          <span />
        )}

        <span
          style={{
            fontSize: 15,
            fontWeight: isToday || isSelected ? 700 : 500,
            lineHeight: 1.2,
            color: numberColor,
            flexShrink: 0,
          }}
        >
          {dayNumber}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 5,
          minHeight: 10,
          flexWrap: 'wrap',
        }}
      >
        {dotColors.map((color, index) => (
          <span
            key={`${color}-${index}`}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              boxShadow: `0 0 0 1.5px ${color}33`,
            }}
          />
        ))}
      </div>
    </button>
  )
})
