import { Alert, App, Col, Row, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd/es/upload'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import {
  buildDashboardSummaryQuery,
  createDefaultDashboardFilters,
  type DashboardFilters,
} from '@/features/home/lib/dashboard-filters'
import type {
  DashboardSummary,
  DashboardTodayPprTask,
} from '@/features/home/model/dashboard-types'
import { DashboardActivityPanels } from '@/features/home/ui/DashboardActivityPanels'
import { DashboardFiltersBar } from '@/features/home/ui/DashboardFiltersBar'
import { HomeIncomingApplicationsPanel } from '@/features/home/ui/HomeIncomingApplicationsPanel'
import {
  buildHomePprExecutionPayload,
  HomePprExecutionModal,
} from '@/features/home/ui/HomePprExecutionModal'
import { HomeTodayPprTasksPanel } from '@/features/home/ui/HomeTodayPprTasksPanel'
import { DashboardKpiCards } from '@/features/home/ui/DashboardKpiCards'
import { DashboardPprOverview } from '@/features/home/ui/DashboardPprOverview'
import { HomePageSkeleton } from '@/features/home/ui/HomePageSkeleton'
import type { PprExecutionFormSchema } from '@/features/ppr-calendar/model/ppr-execution-form-schema'
import { fetchDashboardSummary } from '@/shared/api/dashboard-api'
import type { EntityChangeEvent } from '@/shared/api/types'
import { executePprCalendarEntry } from '@/shared/api/ppr-calendar-api'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { socketService } from '@/shared/lib/socket'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { scrollablePageStyle } from '@/shared/lib/page-layout'
import { getAccessToken } from '@/shared/lib/token-storage'

const { Title, Text } = Typography

import { HOME_PAGE_GAP } from '@/features/home/lib/home-page-layout'

function buildDefaultPeriodRange(): [dayjs.Dayjs, dayjs.Dayjs] {
  return [dayjs().startOf('year'), dayjs().endOf('year')]
}

export function HomePage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const { canViewAll, currentUser } = useStructuralUnitScope()
  const { canView } = useRolePermissions()
  const isStructuralUnitsHydrated = useStructuralUnitsStore((state) => state.isHydrated)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [selectedPprTask, setSelectedPprTask] = useState<DashboardTodayPprTask | null>(null)
  const [isExecutingPpr, setIsExecutingPpr] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    createDefaultDashboardFilters({
      periodRange: buildDefaultPeriodRange(),
    }),
  )

  const defaultFilters = useMemo(
    () =>
      createDefaultDashboardFilters({
        structuralUnitId: canViewAll ? undefined : currentUser?.structuralUnitId,
        periodRange: buildDefaultPeriodRange(),
      }),
    [canViewAll, currentUser?.structuralUnitId],
  )

  useEffect(() => {
    if (!isStructuralUnitsHydrated || !currentUser || initialized) {
      return
    }

    setFilters(defaultFilters)
    setInitialized(true)
  }, [currentUser, defaultFilters, initialized, isStructuralUnitsHydrated])

  const loadSummary = useCallback(async () => {
    if (!initialized || !getAccessToken()) {
      return
    }

    setLoading(true)

    try {
      const data = await fetchDashboardSummary(buildDashboardSummaryQuery(filters))
      setSummary(data)
    } catch (error) {
      notifyApiError(error)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [filters, initialized, notifyApiError])

  useEffect(() => {
    if (!initialized || !getAccessToken()) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadSummary()
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [initialized, loadSummary])

  useEffect(() => {
    const socket = socketService.instance

    if (!socket || !initialized) {
      return
    }

    const handleEntityChange = (event: EntityChangeEvent) => {
      if (event.entity === 'applications' || event.entity === 'ppr-calendar') {
        void loadSummary()
      }
    }

    socket.on('entity:change', handleEntityChange)

    return () => {
      socket.off('entity:change', handleEntityChange)
    }
  }, [initialized, loadSummary])

  const handleResetFilters = () => {
    setFilters(defaultFilters)
  }

  const canViewPpr = canView('/ppr-calendar') || canView('/management/ppr')
  const canViewIncoming = canView('/applications/incoming')
  const canExecutePpr = canView('/ppr-calendar') || canView('/management/ppr')

  const handleOpenPprExecution = (task: DashboardTodayPprTask) => {
    setSelectedPprTask(task)
  }

  const handleClosePprExecution = () => {
    if (isExecutingPpr) {
      return
    }

    setSelectedPprTask(null)
  }

  const handleExecutePpr = async (
    values: PprExecutionFormSchema,
    images: UploadFile[],
    files: UploadFile[],
  ) => {
    if (!selectedPprTask) {
      return
    }

    setIsExecutingPpr(true)

    try {
      const payload = await buildHomePprExecutionPayload(values, images, files)
      await executePprCalendarEntry(selectedPprTask.entryId, payload)
      message.success(t('homePage.actions.executionSuccess'))
      setSelectedPprTask(null)
      await loadSummary()
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsExecutingPpr(false)
    }
  }

  const summaryStatCards = useMemo(() => {
    if (!summary) {
      return []
    }

    const cards = [
      {
        key: 'submitted',
        label: t('homePage.summary.submittedApplications'),
        value: summary.kpis.applications.submitted,
      },
      {
        key: 'completed',
        label: t('homePage.summary.completedApplications'),
        value: summary.kpis.applications.completed,
      },
      {
        key: 'cancelled',
        label: t('homePage.summary.cancelledApplications'),
        value: summary.kpis.applications.cancelled,
      },
    ]

    if (canViewPpr) {
      cards.push({
        key: 'approved-ppr',
        label: t('homePage.summary.approvedPprMonths'),
        value: summary.kpis.ppr.approvedMonths,
      })
    }

    return cards
  }, [canViewPpr, summary, t])

  const todayIncomingApplications = useMemo(
    () =>
      summary?.priorityIncomingApplications.filter((item) =>
        dayjs(item.createdAt).isSame(dayjs(), 'day'),
      ) ?? [],
    [summary?.priorityIncomingApplications],
  )

  const hasTodayPprTasks = (summary?.todayPprTasks.length ?? 0) > 0

  if (!isStructuralUnitsHydrated || !initialized) {
    return (
      <div
        style={{
          ...scrollablePageStyle,
          display: 'flex',
          flexDirection: 'column',
          gap: HOME_PAGE_GAP,
          width: '100%',
        }}
      >
        <HomePageSkeleton
          variant="full"
          showPprSection={canViewPpr}
        />
      </div>
    )
  }

  const welcomeName = summary?.context.userName || currentUser?.firstName || ''

  return (
    <div
      style={{
        ...scrollablePageStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: HOME_PAGE_GAP,
      }}
    >
      <div>
        <Title level={3} style={{ margin: 0 }}>
          {t('homePage.title', { name: welcomeName })}
        </Title>
      </div>

      <DashboardFiltersBar
        filters={filters}
        canViewAll={canViewAll}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      {loading && !summary ? (
        <HomePageSkeleton
          variant="content"
          showPprSection={canViewPpr}
        />
      ) : summary ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: HOME_PAGE_GAP }}>
          {((canViewIncoming && todayIncomingApplications.length > 0) ||
            (canViewPpr && hasTodayPprTasks)) && (
            <Row gutter={[HOME_PAGE_GAP, HOME_PAGE_GAP]}>
              {canViewIncoming && todayIncomingApplications.length > 0 && (
                <Col xs={24}>
                  <div style={{ width: '100%' }}>
                    <HomeIncomingApplicationsPanel items={summary.priorityIncomingApplications} />
                  </div>
                </Col>
              )}

              {canViewPpr && hasTodayPprTasks && (
                <Col xs={24}>
                  <div style={{ width: '100%' }}>
                    <HomeTodayPprTasksPanel
                      items={summary.todayPprTasks}
                      canExecute={canExecutePpr}
                      onExecute={handleOpenPprExecution}
                    />
                  </div>
                </Col>
              )}
            </Row>
          )}

          {summary.kpis.applications.overdue > 0 && (
            <Alert
              type="warning"
              showIcon
              message={t('homePage.alerts.overdueApplications', {
                count: summary.kpis.applications.overdue,
              })}
            />
          )}

          {summary.kpis.ppr.pendingApprovalMonths > 0 && canViewPpr && (
            <Alert
              type="info"
              showIcon
              message={t('homePage.alerts.pendingPprMonths', {
                count: summary.kpis.ppr.pendingApprovalMonths,
              })}
            />
          )}

          <DashboardKpiCards summary={summary} />

          <Row gutter={[HOME_PAGE_GAP, HOME_PAGE_GAP]} align="stretch">
            {canViewPpr && (
              <Col xs={24} xl={12} style={{ display: 'flex' }}>
                <div
                  style={{
                    flex: 1,
                    width: '100%',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <DashboardPprOverview ppr={summary.kpis.ppr} />
                </div>
              </Col>
            )}

            <Col
              xs={24}
              xl={canViewPpr ? 12 : 24}
              style={{ display: 'flex', minWidth: 0 }}
            >
              <SummaryStatsGrid cards={summaryStatCards} fillHeight={canViewPpr} />
            </Col>
          </Row>

          <DashboardActivityPanels
            recentApplications={summary.recentApplications}
            upcomingDeadlines={summary.upcomingDeadlines}
            recentNotifications={summary.recentNotifications}
          />
        </div>
      ) : (
        <Alert
          type="error"
          showIcon
          message={t('homePage.errors.loadFailed')}
          action={
            <Text style={{ cursor: 'pointer' }} onClick={() => void loadSummary()}>
              {t('homePage.filters.refresh')}
            </Text>
          }
        />
      )}

      <HomePprExecutionModal
        open={Boolean(selectedPprTask)}
        task={selectedPprTask}
        isSaving={isExecutingPpr}
        onClose={handleClosePprExecution}
        onSave={handleExecutePpr}
      />
    </div>
  )
}

function SummaryStatsGrid({
  cards,
  fillHeight,
}: {
  cards: Array<{ key: string; label: string; value: number }>
  fillHeight: boolean
}) {
  const columnCount = cards.length <= 1 ? 1 : 2
  const rowCount = fillHeight && cards.length > 2 ? 2 : Math.ceil(cards.length / columnCount)

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: fillHeight ? '100%' : 'auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gridTemplateRows: fillHeight
          ? `repeat(${rowCount}, minmax(0, 1fr))`
          : 'auto',
        gap: HOME_PAGE_GAP,
        alignContent: fillHeight ? 'stretch' : 'start',
      }}
    >
      {cards.map((card) => (
        <SummaryStatCard key={card.key} label={card.label} value={card.value} />
      ))}
    </div>
  )
}

function SummaryStatCard({ label, value }: { label: string; value: number }) {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        padding: '16px 18px',
        background: token.colorBgContainer,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Text type="secondary">{label}</Text>
      <Title level={3} style={{ margin: '6px 0 0' }}>
        {value}
      </Title>
    </div>
  )
}
