import { CheckOutlined, InboxOutlined } from '@ant-design/icons'
import { Alert, App, Button, Select, Space, Tag } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type {
  PprCalendarEntry,
  PprCalendarMonth,
  PprCalendarViewScope,
} from '@/entities/ppr-calendar/model/types'
import { usePprCalendarStore } from '@/entities/ppr-calendar/model/ppr-calendar-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import {
  buildEmptyCalendarMonth,
  canManagePprCalendarMonth,
  canClearPprCalendarMonth,
  canSubmitPprCalendarMonth,
  getMonthSectionId,
  getPrimaryHeadedStructuralUnit,
  isStructuralUnitHead,
  monthToViewScope,
} from '@/features/ppr-calendar/lib/calendar-entries'
import type { PprCalendarEntryFormSchema } from '@/features/ppr-calendar/model/ppr-calendar-entry-form-schema'
import { PprCalendar } from '@/features/ppr-calendar/ui/PprCalendar'
import { PprCalendarIncomingApprovalsModal } from '@/features/ppr-calendar/ui/PprCalendarIncomingApprovalsModal'
import { PprCalendarApproveModal } from '@/features/ppr-calendar/ui/PprCalendarApproveModal'
import { PprCalendarDayDrawer } from '@/features/ppr-calendar/ui/PprCalendarDayDrawer'
import { PprCalendarEntryDrawer } from '@/features/ppr-calendar/ui/PprCalendarEntryDrawer'
import { PprCalendarEntryModal } from '@/features/ppr-calendar/ui/PprCalendarEntryModal'
import { PprCalendarPageSkeleton } from '@/features/ppr-calendar/ui/PprCalendarPageSkeleton'
import { PprCalendarSubmitModal } from '@/features/ppr-calendar/ui/PprCalendarSubmitModal'
import { PprCalendarClearModal } from '@/features/ppr-calendar/ui/PprCalendarClearModal'
import { PprCalendarEntryDetailDrawer } from '@/features/ppr-calendar/ui/PprCalendarEntryDetailDrawer'
import { buildExecutionAttachments } from '@/features/ppr-calendar/ui/PprCalendarExecutionDrawer'
import { usePprCalendarHydration } from '@/shared/hooks/usePprCalendarHydration'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'
import { getAccessToken } from '@/shared/lib/token-storage'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

const PAGE_KEY = '/ppr-calendar'

type ScopeSelectValue = `structure` | `section:${string}`

function scopeToSelectValue(scope: PprCalendarViewScope): ScopeSelectValue {
  return scope.type === 'structure' ? 'structure' : `section:${scope.sectionId}`
}

function selectValueToScope(value: ScopeSelectValue): PprCalendarViewScope {
  if (value === 'structure') {
    return { type: 'structure' }
  }

  return { type: 'section', sectionId: value.replace('section:', '') }
}

function scopeToSectionId(scope: PprCalendarViewScope): string | undefined {
  return scope.type === 'section' ? scope.sectionId : undefined
}

export function PprCalendarPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const isHydrated = usePprCalendarHydration()
  const revisionHint = t('pprCalendar.messages.revisionHint')
  const { currentUser, users, canViewAll } = useStructuralUnitScope()
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

  const activeMonth = usePprCalendarStore((state) => state.activeMonth)
  const pendingMonths = usePprCalendarStore((state) => state.pendingMonths)
  const isLoadingMonth = usePprCalendarStore((state) => state.isLoadingMonth)
  const isLoadingPending = usePprCalendarStore((state) => state.isLoadingPending)
  const loadMonth = usePprCalendarStore((state) => state.loadMonth)
  const loadPendingMonths = usePprCalendarStore((state) => state.loadPendingMonths)
  const createEntry = usePprCalendarStore((state) => state.createEntry)
  const updateEntry = usePprCalendarStore((state) => state.updateEntry)
  const removeEntry = usePprCalendarStore((state) => state.removeEntry)
  const submitMonth = usePprCalendarStore((state) => state.submitMonth)
  const approveMonth = usePprCalendarStore((state) => state.approveMonth)
  const rejectMonth = usePprCalendarStore((state) => state.rejectMonth)
  const clearMonth = usePprCalendarStore((state) => state.clearMonth)
  const executeEntry = usePprCalendarStore((state) => state.executeEntry)

  const [visibleMonth, setVisibleMonth] = useState(() => dayjs().startOf('month'))
  const [viewScope, setViewScope] = useState<PprCalendarViewScope>({ type: 'structure' })
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false)
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false)
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [entryDetailOpen, setEntryDetailOpen] = useState(false)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [incomingApprovalsOpen, setIncomingApprovalsOpen] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PprCalendarEntry | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<PprCalendarEntry | null>(null)
  const [detailEntry, setDetailEntry] = useState<PprCalendarEntry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [calendarUnitIdOverride, setCalendarUnitIdOverride] = useState<string | undefined>()
  const [reviewMonthId, setReviewMonthId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const structuralUnit = useMemo(
    () => structuralUnits.find((item) => item.id === currentUser?.structuralUnitId),
    [currentUser?.structuralUnitId, structuralUnits],
  )

  const headedUnit = useMemo(
    () => getPrimaryHeadedStructuralUnit(structuralUnits, currentUser, users),
    [currentUser, structuralUnits, users],
  )

  const structuralUnitOptions = useMemo(
    () =>
      [...structuralUnits]
        .sort((left, right) => left.shortName.localeCompare(right.shortName, 'uz'))
        .map((unit) => ({
          value: unit.id,
          label: unit.shortName,
        })),
    [structuralUnits],
  )

  const defaultBrowseUnitId = useMemo(() => {
    if (!canViewAll) {
      return undefined
    }

    if (currentUser?.structuralUnitId) {
      return currentUser.structuralUnitId
    }

    return structuralUnitOptions[0]?.value
  }, [canViewAll, currentUser?.structuralUnitId, structuralUnitOptions])

  const calendarUnitId = canViewAll
    ? (calendarUnitIdOverride ?? defaultBrowseUnitId)
    : (calendarUnitIdOverride ?? headedUnit?.id ?? structuralUnit?.id)
  const calendarUnit = useMemo(
    () => structuralUnits.find((item) => item.id === calendarUnitId),
    [calendarUnitId, structuralUnits],
  )
  const activeUnit = calendarUnit ?? headedUnit ?? structuralUnit
  const isHeadOfSelectedUnit = useMemo(
    () =>
      headedUnit?.id === calendarUnitId ||
      isStructuralUnitHead(currentUser?.id, calendarUnit, users),
    [calendarUnit, calendarUnitId, currentUser?.id, headedUnit?.id, users],
  )
  const isBrowseOnly = useMemo(
    () =>
      canViewAll &&
      calendarUnitId !== currentUser?.structuralUnitId &&
      !isHeadOfSelectedUnit,
    [calendarUnitId, canViewAll, currentUser?.structuralUnitId, isHeadOfSelectedUnit],
  )

  const scopeOptions = useMemo(() => {
    const options: Array<{ value: ScopeSelectValue; label: string }> = [
      { value: 'structure', label: t('pprCalendar.scope.structure') },
    ]

    for (const section of activeUnit?.sections ?? []) {
      options.push({
        value: `section:${section.id}`,
        label: `${t('pprCalendar.scope.section')}: ${section.shortName}`,
      })
    }

    return options
  }, [activeUnit?.sections, t])

  const reviewingMonth = useMemo(
    () => pendingMonths.find((item) => item.id === reviewMonthId),
    [pendingMonths, reviewMonthId],
  )

  const emptyCalendarMonth = useMemo(
    () =>
      calendarUnitId
        ? buildEmptyCalendarMonth({
            structuralUnitId: calendarUnitId,
            sectionId: scopeToSectionId(viewScope),
            year: visibleMonth.year(),
            month: visibleMonth.month() + 1,
          })
        : null,
    [calendarUnitId, viewScope, visibleMonth],
  )

  const displayedMonth = useMemo(() => {
    if (isHeadOfSelectedUnit && reviewingMonth) {
      return reviewingMonth
    }

    if (activeMonth?.status === 'approved') {
      return activeMonth
    }

    if (canViewAll && activeMonth) {
      return activeMonth
    }

    if (!isHeadOfSelectedUnit && activeMonth && (canCreate(PAGE_KEY) || canEdit(PAGE_KEY))) {
      return activeMonth
    }

    return emptyCalendarMonth
  }, [
    activeMonth,
    canCreate,
    canEdit,
    canViewAll,
    emptyCalendarMonth,
    isHeadOfSelectedUnit,
    reviewingMonth,
  ])

  const calendarMonth = displayedMonth ?? emptyCalendarMonth

  const isReviewingPending = displayedMonth?.status === 'pending_approval'
  const isApprovedMonth = displayedMonth?.status === 'approved'
  const canApproveDisplayedMonth =
    isHeadOfSelectedUnit && isReviewingPending && Boolean(displayedMonth?.id)

  const displayedMonthLabel = useMemo(() => {
    if (!displayedMonth) {
      return ''
    }

    return `${t(`pprCalendar.months.${displayedMonth.month - 1}`)} ${displayedMonth.year}`
  }, [displayedMonth, t])

  const canManageMonth = useMemo(
    () =>
      canManagePprCalendarMonth(
        displayedMonth?.status ?? activeMonth?.status ?? 'draft',
        canCreate(PAGE_KEY),
        canEdit(PAGE_KEY),
      ),
    [activeMonth?.status, canCreate, canEdit, displayedMonth?.status],
  )

  const canViewMonth = useMemo(() => Boolean(calendarMonth), [calendarMonth])

  const isEditable = canManageMonth && !isBrowseOnly

  const canSubmit = useMemo(
    () =>
      !isBrowseOnly &&
      !isReviewingPending &&
      canSubmitPprCalendarMonth(
        activeMonth?.status ?? 'draft',
        canCreate(PAGE_KEY),
        activeMonth?.entries.length ?? 0,
      ) && Boolean(activeMonth?.id),
    [activeMonth, canCreate, isBrowseOnly, isReviewingPending],
  )

  const canClear = useMemo(
    () =>
      !isBrowseOnly &&
      !isReviewingPending &&
      canClearPprCalendarMonth(
        activeMonth?.status ?? 'draft',
        canCreate(PAGE_KEY),
        activeMonth?.entries.length ?? 0,
        Boolean(activeMonth?.id),
      ),
    [activeMonth, canCreate, isBrowseOnly, isReviewingPending],
  )

  useEffect(() => {
    if (!detailEntry || !activeMonth) {
      return
    }

    const updatedEntry = activeMonth.entries.find((item) => item.id === detailEntry.id)

    if (updatedEntry) {
      setDetailEntry(updatedEntry)
    }
  }, [activeMonth, detailEntry?.id])

  const reloadMonth = useCallback(async () => {
    if (!calendarUnitId) {
      return
    }

    await loadMonth({
      structuralUnitId: calendarUnitId,
      sectionId: scopeToSectionId(viewScope),
      year: visibleMonth.year(),
      month: visibleMonth.month() + 1,
    })
  }, [calendarUnitId, loadMonth, viewScope, visibleMonth])

  useEffect(() => {
    if (!isHydrated || !calendarUnitId || !getAccessToken()) {
      return
    }

    void reloadMonth().catch(() => {
      // Month load can fail for heads outside the unit; approval flow still works.
    })
  }, [calendarUnitId, isHydrated, reloadMonth])

  useEffect(() => {
    if (!isHeadOfSelectedUnit || !getAccessToken()) {
      return
    }

    void loadPendingMonths(headedUnit?.id)
  }, [headedUnit?.id, isHeadOfSelectedUnit, loadPendingMonths, activeMonth?.status])

  const handleReviewPendingMonth = useCallback((month: PprCalendarMonth) => {
    setReviewMonthId(month.id)
    setVisibleMonth(dayjs().year(month.year).month(month.month - 1).startOf('month'))
    setViewScope(monthToViewScope(month))

    if (month.structuralUnitId !== calendarUnitId) {
      setCalendarUnitIdOverride(month.structuralUnitId)
    }
  }, [calendarUnitId])

  const handleOpenIncomingApprovals = async () => {
    await loadPendingMonths(headedUnit?.id)
    setIncomingApprovalsOpen(true)
  }

  useEffect(() => {
    if (!isHydrated || !currentUser) {
      return
    }

    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    const sectionIdParam = searchParams.get('sectionId')
    const structuralUnitIdParam = searchParams.get('structuralUnitId')
    const openApproval = searchParams.get('openApproval') === '1'

    if (!yearParam && !monthParam && !sectionIdParam && !structuralUnitIdParam && !openApproval) {
      return
    }

    if (openApproval && !isHeadOfSelectedUnit) {
      return
    }

    if (structuralUnitIdParam) {
      setCalendarUnitIdOverride(structuralUnitIdParam)
    }

    if (yearParam && monthParam) {
      const year = Number(yearParam)
      const month = Number(monthParam)

      if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
        setVisibleMonth(dayjs().year(year).month(month - 1).startOf('month'))
      }
    }

    if (sectionIdParam) {
      setViewScope({ type: 'section', sectionId: sectionIdParam })
    }

    if (openApproval && isHeadOfSelectedUnit) {
      void loadPendingMonths(headedUnit?.id).then((months) => {
        const year = yearParam ? Number(yearParam) : NaN
        const month = monthParam ? Number(monthParam) : NaN
        const matched =
          months.find(
            (item) =>
              !Number.isNaN(year) &&
              !Number.isNaN(month) &&
              item.year === year &&
              item.month === month &&
              (!sectionIdParam || item.sectionId === sectionIdParam),
          ) ?? months[0]

        if (matched) {
          handleReviewPendingMonth(matched)
          return
        }

        if (months.length > 0) {
          setIncomingApprovalsOpen(true)
        }
      })
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('year')
    nextParams.delete('month')
    nextParams.delete('sectionId')
    nextParams.delete('structuralUnitId')
    nextParams.delete('openApproval')
    setSearchParams(nextParams, { replace: true })
  }, [
    headedUnit?.id,
    handleReviewPendingMonth,
    isHeadOfSelectedUnit,
    isHydrated,
    loadPendingMonths,
    searchParams,
    setSearchParams,
  ])

  const dayEntries = useMemo(() => {
    if (!selectedDate || !calendarMonth) {
      return []
    }

    const dateKey = selectedDate.format('YYYY-MM-DD')

    return calendarMonth.entries.filter((entry) => entry.date === dateKey)
  }, [calendarMonth, selectedDate])

  const handleDateClick = (date: Dayjs) => {
    if (!canViewMonth) {
      return
    }

    setSelectedDate(date)
    setDayDrawerOpen(true)
  }

  const handleAddEntry = () => {
    setEditingEntry(null)
    setEntryDrawerOpen(true)
  }

  const handleEditEntry = (entry: PprCalendarEntry) => {
    setEditingEntry(entry)
    setEntryDrawerOpen(true)
  }

  const handleOpenEntry = (entry: PprCalendarEntry) => {
    if (isApprovedMonth) {
      setDetailEntry(entry)
      setEntryDetailOpen(true)
      return
    }

    setSelectedEntry(entry)
    setEntryModalOpen(true)
  }

  const handleSaveExecution = async (
    values: import('@/features/ppr-calendar/model/ppr-execution-form-schema').PprExecutionFormSchema,
    images: import('antd/es/upload').UploadFile[],
    files: import('antd/es/upload').UploadFile[],
  ) => {
    if (!detailEntry) {
      return
    }

    setIsExecuting(true)

    try {
      const attachments = await buildExecutionAttachments(images, files)

      await executeEntry(detailEntry.id, {
        objectIds: values.objectIds,
        images: attachments.images,
        files: attachments.files,
        comment: values.comment,
      })

      message.success(t('pprCalendar.messages.executionSuccess'))
    } catch (error) {
      notifyApiError(error)
      throw error
    } finally {
      setIsExecuting(false)
    }
  }

  const handleSaveEntry = async (values: PprCalendarEntryFormSchema) => {
    if (!calendarUnitId || !selectedDate) {
      return
    }

    if (editingEntry) {
      await updateEntry(editingEntry.id, values)
      return
    }

    await createEntry({
      ...values,
      structuralUnitId: calendarUnitId!,
      sectionId: getMonthSectionId(scopeToSectionId(viewScope)),
      year: visibleMonth.year(),
      month: visibleMonth.month() + 1,
      date: selectedDate.format('YYYY-MM-DD'),
    })
  }

  const handleDeleteEntry = async (entry: PprCalendarEntry) => {
    await removeEntry(entry.id)
  }

  const handleSubmitMonth = async () => {
    if (!activeMonth?.id) {
      return
    }

    setIsSubmitting(true)

    try {
      await submitMonth(activeMonth.id)
      message.success(t('pprCalendar.messages.submitSuccess'))
      setSubmitModalOpen(false)
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearMonth = async () => {
    if (!activeMonth?.id) {
      return
    }

    setIsClearing(true)

    try {
      await clearMonth(activeMonth.id)
      message.success(t('pprCalendar.messages.clearSuccess'))
      setClearModalOpen(false)
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleApproveMonth = async () => {
    if (!displayedMonth?.id) {
      return
    }

    setIsApproving(true)

    try {
      await approveMonth(displayedMonth.id)
      message.success(t('pprCalendar.messages.approveSuccess'))
      setApproveModalOpen(false)
      setReviewMonthId(null)
      await loadPendingMonths(headedUnit?.id)
      await reloadMonth().catch(() => undefined)
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleRejectPendingMonth = async (monthId: string) => {
    await rejectMonth(monthId)

    if (reviewMonthId === monthId) {
      setReviewMonthId(null)
    }

    await loadPendingMonths(headedUnit?.id)
  }

  const handleUnitChange = (unitId: string) => {
    setCalendarUnitIdOverride(unitId)
    setViewScope({ type: 'structure' })
    setReviewMonthId(null)
  }

  useEffect(() => {
    if (viewScope.type !== 'section') {
      return
    }

    const hasSection = activeUnit?.sections.some((section) => section.id === viewScope.sectionId)

    if (!hasSection) {
      setViewScope({ type: 'structure' })
    }
  }, [activeUnit?.sections, viewScope])

  if (!isHydrated || isLoadingMonth) {
    return <PprCalendarPageSkeleton />
  }

  if (!currentUser || !calendarUnitId) {
    return null
  }

  return (
    <div
      style={{
        ...fullHeightPageStyle,
        width: '100%',
        height: '100%',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Space wrap>
          {canViewAll ? (
            <Select
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 260 }}
              value={calendarUnitId}
              options={structuralUnitOptions}
              placeholder={t('pprCalendar.filters.structuralUnit')}
              onChange={handleUnitChange}
            />
          ) : null}
          <Select<ScopeSelectValue>
            style={{ minWidth: 260 }}
            value={scopeToSelectValue(viewScope)}
            options={scopeOptions}
            onChange={(value) => setViewScope(selectValueToScope(value))}
          />
          {displayedMonth?.id && displayedMonth.status ? (
            <Tag color={displayedMonth.status === 'approved' ? 'success' : 'processing'}>
              {t(`pprCalendar.status.${displayedMonth.status}`)}
            </Tag>
          ) : null}
        </Space>

        {isHeadOfSelectedUnit ? (
          <Space wrap>
            {canApproveDisplayedMonth ? (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setApproveModalOpen(true)}>
                {t('pprCalendar.actions.approve')}
              </Button>
            ) : null}
            <Button icon={<InboxOutlined />} onClick={() => void handleOpenIncomingApprovals()}>
              {t('pprCalendar.actions.incomingApprovals')}
              {pendingMonths.length > 0 ? ` (${pendingMonths.length})` : ''}
            </Button>
          </Space>
        ) : null}
      </div>

      {isReviewingPending ? (
        <Alert type="info" showIcon message={t('pprCalendar.messages.reviewHint')} />
      ) : null}

      {canClear && revisionHint ? (
        <Alert type="warning" showIcon message={revisionHint} />
      ) : null}

      {calendarMonth ? (
        <PprCalendar
          month={calendarMonth}
          visibleMonth={visibleMonth}
          onVisibleMonthChange={setVisibleMonth}
          isEditable={isEditable}
          canSubmit={canSubmit}
          canClear={canClear}
          showExecutionProgress={isApprovedMonth}
          onDateClick={handleDateClick}
          onEntryClick={handleOpenEntry}
          onSubmitMonth={() => setSubmitModalOpen(true)}
          onClearMonth={() => setClearModalOpen(true)}
        />
      ) : null}

      <PprCalendarDayDrawer
        open={dayDrawerOpen}
        date={selectedDate}
        entries={dayEntries}
        canCreate={isEditable && canCreate(PAGE_KEY) && !isReviewingPending}
        canEdit={isEditable && canEdit(PAGE_KEY) && !isReviewingPending}
        canDelete={isEditable && canDelete(PAGE_KEY) && !isReviewingPending}
        onClose={() => setDayDrawerOpen(false)}
        onAdd={handleAddEntry}
        onEdit={handleEditEntry}
        onOpenEntry={handleOpenEntry}
        onDelete={handleDeleteEntry}
      />

      <PprCalendarEntryDrawer
        open={entryDrawerOpen}
        date={selectedDate}
        structuralUnit={activeUnit!}
        viewScope={viewScope}
        editingEntry={editingEntry}
        onClose={() => {
          setEntryDrawerOpen(false)
          setEditingEntry(null)
        }}
        onSave={handleSaveEntry}
      />

      <PprCalendarEntryModal
        open={entryModalOpen}
        entry={selectedEntry}
        canEdit={isEditable && canEdit(PAGE_KEY) && !isReviewingPending}
        canDelete={isEditable && canDelete(PAGE_KEY) && !isReviewingPending}
        onClose={() => {
          setEntryModalOpen(false)
          setSelectedEntry(null)
        }}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />

      <PprCalendarEntryDetailDrawer
        open={entryDetailOpen}
        entry={detailEntry}
        monthApproved={isApprovedMonth && !isBrowseOnly}
        isSaving={isExecuting}
        onClose={() => {
          setEntryDetailOpen(false)
          setDetailEntry(null)
        }}
        onSaveExecution={handleSaveExecution}
      />

      <PprCalendarSubmitModal
        open={submitModalOpen}
        headFullName={activeUnit?.headFullName ?? ''}
        isSubmitting={isSubmitting}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={handleSubmitMonth}
      />

      <PprCalendarClearModal
        open={clearModalOpen}
        monthLabel={displayedMonthLabel}
        isSubmitting={isClearing}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleClearMonth}
      />

      <PprCalendarApproveModal
        open={approveModalOpen}
        monthLabel={displayedMonthLabel}
        isSubmitting={isApproving}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={handleApproveMonth}
      />

      <PprCalendarIncomingApprovalsModal
        open={incomingApprovalsOpen}
        months={pendingMonths}
        isLoading={isLoadingPending}
        onClose={() => setIncomingApprovalsOpen(false)}
        onReview={handleReviewPendingMonth}
        onReject={handleRejectPendingMonth}
      />
    </div>
  )
}
