import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { App, Button, Modal, Space, Tag, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import type { PprCalendarEntry, PprCalendarMonth } from '@/entities/ppr-calendar/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { PprCalendar } from '@/features/ppr-calendar/ui/PprCalendar'
import { PprCalendarDayDrawer } from '@/features/ppr-calendar/ui/PprCalendarDayDrawer'
import { PprCalendarEntryDetailDrawer } from '@/features/ppr-calendar/ui/PprCalendarEntryDetailDrawer'
import {
  adminClearPprCalendarMonth,
  adminDeletePprCalendarEntry,
  fetchApprovedPprCalendarMonthById,
} from '@/shared/api/ppr-calendar-api'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

const { Text } = Typography
const PAGE_KEY = '/management/ppr'

export function PprManagementMonthPage() {
  const { monthId } = useParams<{ monthId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const { canView, canDelete } = useRolePermissions()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

  const [month, setMonth] = useState<PprCalendarMonth | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false)
  const [detailEntry, setDetailEntry] = useState<PprCalendarEntry | null>(null)
  const [entryDetailOpen, setEntryDetailOpen] = useState(false)

  const visibleMonth = useMemo(
    () =>
      month
        ? dayjs().year(month.year).month(month.month - 1).startOf('month')
        : dayjs().startOf('month'),
    [month],
  )

  const [calendarMonth, setCalendarMonth] = useState(visibleMonth)

  useEffect(() => {
    setCalendarMonth(visibleMonth)
  }, [visibleMonth])

  const loadMonth = useCallback(async () => {
    if (!monthId) {
      return
    }

    setLoading(true)

    try {
      const data = await fetchApprovedPprCalendarMonthById(monthId)
      setMonth(data)
    } catch (error) {
      notifyApiError(error)
      navigate('/management/ppr')
    } finally {
      setLoading(false)
    }
  }, [monthId, navigate, notifyApiError])

  useEffect(() => {
    void loadMonth()
  }, [loadMonth])

  const unitLabel = useMemo(() => {
    if (!month) {
      return ''
    }

    const unit = structuralUnits.find((item) => item.id === month.structuralUnitId)
    return unit?.shortName ?? month.structuralUnitId
  }, [month, structuralUnits])

  const monthLabel = useMemo(() => {
    if (!month) {
      return ''
    }

    return `${t(`pprCalendar.months.${month.month - 1}`)} ${month.year}`
  }, [month, t])

  const dayEntries = useMemo(() => {
    if (!selectedDate || !month) {
      return []
    }

    const dateKey = selectedDate.format('YYYY-MM-DD')
    return month.entries.filter((entry) => entry.date === dateKey)
  }, [month, selectedDate])

  const handleDateClick = (date: Dayjs) => {
    setSelectedDate(date)
    setDayDrawerOpen(true)
  }

  const handleOpenEntry = (entry: PprCalendarEntry) => {
    setDetailEntry(entry)
    setEntryDetailOpen(true)
  }

  const handleDeleteEntry = async (entry: PprCalendarEntry) => {
    try {
      const updated = await adminDeletePprCalendarEntry(entry.id)
      setMonth(updated)
      message.success(t('pprManagement.messages.entryDeleted'))
    } catch (error) {
      notifyApiError(error)
      throw error
    }
  }

  const handleClearMonth = async () => {
    if (!month?.id) {
      return
    }

    setIsClearing(true)

    try {
      await adminClearPprCalendarMonth(month.id)
      setClearModalOpen(false)
      message.success(t('pprManagement.messages.monthCleared'))
      navigate('/management/ppr')
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsClearing(false)
    }
  }

  if (!canView(PAGE_KEY)) {
    return (
      <RequirePageView pageKey={PAGE_KEY}>
        <div />
      </RequirePageView>
    )
  }

  if (loading || !month) {
    return (
      <div style={{ ...fullHeightPageStyle, alignItems: 'center', justifyContent: 'center' }}>
        <Text>{t('common.loading')}</Text>
      </div>
    )
  }

  const canRemove = canDelete(PAGE_KEY)

  return (
    <RequirePageView pageKey={PAGE_KEY}>
    <div style={{ ...fullHeightPageStyle, gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/management/ppr')}>
            {t('pprManagement.backToList')}
          </Button>
          <div>
            <Text strong>{monthLabel}</Text>
            <div>
              <Text type="secondary">{unitLabel}</Text>
            </div>
          </div>
          <Tag color="success">{t('pprCalendar.status.approved')}</Tag>
        </Space>

        {canRemove && (
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={month.entries.length === 0}
            onClick={() => setClearModalOpen(true)}
          >
            {t('pprManagement.actions.clearMonth')}
          </Button>
        )}
      </div>

      <PprCalendar
        month={month}
        visibleMonth={calendarMonth}
        onVisibleMonthChange={setCalendarMonth}
        isEditable={false}
        canSubmit={false}
        canClear={false}
        showExecutionProgress
        onDateClick={handleDateClick}
        onEntryClick={handleOpenEntry}
        onSubmitMonth={() => undefined}
        onClearMonth={() => undefined}
      />

      <PprCalendarDayDrawer
        open={dayDrawerOpen}
        date={selectedDate}
        entries={dayEntries}
        canCreate={false}
        canEdit={false}
        canDelete={canRemove}
        showExecutionProgress
        onClose={() => setDayDrawerOpen(false)}
        onAdd={() => undefined}
        onEdit={() => undefined}
        onOpenEntry={handleOpenEntry}
        onDelete={handleDeleteEntry}
        deleteConfirmTitle={t('pprManagement.deleteEntryConfirm')}
      />

      <PprCalendarEntryDetailDrawer
        open={entryDetailOpen}
        entry={detailEntry}
        monthApproved={false}
        onClose={() => {
          setEntryDetailOpen(false)
          setDetailEntry(null)
        }}
        onSaveExecution={async () => undefined}
      />

      <Modal
        open={clearModalOpen}
        title={t('pprManagement.clearModal.title')}
        onCancel={() => setClearModalOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setClearModalOpen(false)}>{t('common.cancel')}</Button>
            <Button danger type="primary" loading={isClearing} onClick={() => void handleClearMonth()}>
              {t('pprManagement.clearModal.yes')}
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12}>
          <Text>{t('pprManagement.clearModal.message', { monthLabel })}</Text>
          <Text type="secondary">{t('pprManagement.clearModal.hint')}</Text>
        </Space>
      </Modal>
    </div>
    </RequirePageView>
  )
}
