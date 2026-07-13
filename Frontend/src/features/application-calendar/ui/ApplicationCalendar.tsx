import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '@/entities/application/model/types'
import {
  buildMonthGrid,
  formatCalendarMonthTitle,
  getWeekdayLabels,
} from '@/features/application-calendar/lib/build-month-grid'
import { getApplicationsForDate } from '@/features/application-calendar/lib/calendar-applications'
import { ApplicationCalendarEventModal } from '@/features/application-calendar/ui/ApplicationCalendarEventModal'
import { useUiStore } from '@/shared/stores/ui-store'

const MAX_VISIBLE_EVENTS = 2

interface ApplicationCalendarProps {
  applicationsByDeadline: Map<string, Application[]>
  value?: Dayjs
  onChange?: (date: Dayjs) => void
}

function truncateText(text: string, maxLength = 22): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}…`
}

export function ApplicationCalendar({
  applicationsByDeadline,
  value,
  onChange,
}: ApplicationCalendarProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const locale = useUiStore((state) => state.locale)
  const [internalValue, setInternalValue] = useState(() => dayjs())
  const [visibleMonth, setVisibleMonth] = useState(() => dayjs().startOf('month'))
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const selectedDate = value ?? internalValue
  const today = dayjs().startOf('day')

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

  const handleSelectDate = (date: Dayjs) => {
    if (!value) {
      setInternalValue(date)
    }

    onChange?.(date)
  }

  const handleVisibleMonthChange = (nextMonth: Dayjs) => {
    setVisibleMonth(nextMonth.startOf('month'))
  }

  const handleToday = () => {
    const now = dayjs()

    handleVisibleMonthChange(now.startOf('month'))
    handleSelectDate(now)
  }

  const handleOpenApplication = (application: Application, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedApplication(application)
    setModalOpen(true)
  }

  const handleDayKeyDown = (event: React.KeyboardEvent, date: Dayjs) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelectDate(date)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedApplication(null)
  }

  return (
    <>
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
              onClick={() => handleVisibleMonthChange(visibleMonth.subtract(1, 'month'))}
              aria-label={t('applicationCalendar.previousMonth')}
            />
            <Button onClick={handleToday}>{t('applicationCalendar.today')}</Button>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              icon={<RightOutlined />}
              onClick={() => handleVisibleMonthChange(visibleMonth.add(1, 'month'))}
              aria-label={t('applicationCalendar.nextMonth')}
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
              const dayApplications = getApplicationsForDate(applicationsByDeadline, normalizedDate)
              const visibleApplications = dayApplications.slice(0, MAX_VISIBLE_EVENTS)
              const hiddenCount = dayApplications.length - visibleApplications.length
              const isCurrentMonth = normalizedDate.month() === visibleMonth.month()
              const isToday = normalizedDate.isSame(today, 'day')
              const isSelected = normalizedDate.isSame(selectedDate.startOf('day'), 'day')
              const isWeekend = normalizedDate.day() === 0 || normalizedDate.day() === 6

              return (
                <div
                  key={normalizedDate.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectDate(normalizedDate)}
                  onKeyDown={(event) => handleDayKeyDown(event, normalizedDate)}
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
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    background: isSelected
                      ? token.colorPrimaryBg
                      : isToday
                        ? token.colorInfoBg
                        : isWeekend
                          ? token.colorFillAlter
                          : token.colorBgContainer,
                    color: isCurrentMonth ? token.colorText : token.colorTextQuaternary,
                    boxShadow: isSelected ? `inset 0 0 0 2px ${token.colorPrimary}` : undefined,
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
                      fontWeight: isToday || isSelected ? 700 : 500,
                      color: isSelected
                        ? token.colorPrimary
                        : isToday
                          ? token.colorInfoText
                          : isCurrentMonth
                            ? token.colorText
                            : token.colorTextQuaternary,
                      background: isToday && !isSelected ? token.colorInfoBg : 'transparent',
                      border:
                        isToday && !isSelected ? `1px solid ${token.colorInfoBorder}` : 'none',
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
                      gap: 4,
                      overflow: 'hidden',
                    }}
                  >
                    {visibleApplications.map((application) => (
                      <button
                        key={application.id}
                        type="button"
                        onClick={(event) => handleOpenApplication(application, event)}
                        title={application.comment}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderRadius: token.borderRadiusSM,
                          margin: 0,
                          padding: '4px 6px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: token.colorWarningBg,
                          color: token.colorWarningText,
                          fontSize: 11,
                          fontWeight: 600,
                          lineHeight: 1.3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {truncateText(application.comment)}
                      </button>
                    ))}

                    {hiddenCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: token.colorTextSecondary,
                          paddingLeft: 4,
                        }}
                      >
                        {t('applicationCalendar.moreEvents', { count: hiddenCount })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ApplicationCalendarEventModal
        open={modalOpen}
        application={selectedApplication}
        onClose={handleCloseModal}
      />
    </>
  )
}
