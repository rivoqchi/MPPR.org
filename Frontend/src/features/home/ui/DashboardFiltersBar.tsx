import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import {
  hasActiveDashboardFilters,
  type DashboardApplicationScope,
  type DashboardFilters,
  type DashboardScopeValue,
} from '@/features/home/lib/dashboard-filters'
import { pageToolbarActionStyle, pageToolbarStyle } from '@/shared/lib/page-layout'

const { RangePicker } = DatePicker

interface DashboardFiltersBarProps {
  filters: DashboardFilters
  loading: boolean
  canViewAll: boolean
  onFiltersChange: (filters: DashboardFilters) => void
  onReset: () => void
  onRefresh: () => void
}

export function DashboardFiltersBar({
  filters,
  loading,
  canViewAll,
  onFiltersChange,
  onReset,
  onRefresh,
}: DashboardFiltersBarProps) {
  const { t } = useTranslation()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

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

  const scopeOptions = useMemo(() => {
    const options: Array<{ value: DashboardScopeValue; label: string }> = [
      { value: 'all', label: t('homePage.filters.scopeAll') },
      { value: 'structure', label: t('pprCalendar.scope.structure') },
      { value: 'section', label: t('pprManagement.filters.anySection') },
    ]

    const unit = structuralUnits.find((item) => item.id === filters.structuralUnitId)

    for (const section of unit?.sections ?? []) {
      options.push({
        value: `section:${section.id}`,
        label: `${t('pprCalendar.scope.section')}: ${section.shortName}`,
      })
    }

    return options
  }, [filters.structuralUnitId, structuralUnits, t])

  const applicationScopeOptions = useMemo(
    () =>
      (['all', 'submitted', 'incoming'] as DashboardApplicationScope[]).map((value) => ({
        value,
        label: t(`homePage.filters.applicationScope.${value}`),
      })),
    [t],
  )

  const updateFilters = (patch: Partial<DashboardFilters>) => {
    onFiltersChange({ ...filters, ...patch })
  }

  return (
    <Card size="small" style={{ marginBottom: 0 }} styles={{ body: { padding: 16 } }}>
      <div style={pageToolbarStyle}>
        <Space wrap>
          {canViewAll && (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('pprManagement.filters.structuralUnit')}
              style={{ minWidth: 220 }}
              value={filters.structuralUnitId}
              options={structuralUnitOptions}
              onChange={(value) =>
                updateFilters({
                  structuralUnitId: value,
                  scopeValue: 'all',
                })
              }
            />
          )}

          <Select
            style={{ minWidth: 200 }}
            value={filters.scopeValue}
            options={scopeOptions}
            onChange={(value) => updateFilters({ scopeValue: value })}
          />

          <RangePicker
            picker="month"
            allowEmpty={[true, true]}
            format="MM.YYYY"
            placeholder={[t('homePage.filters.periodFrom'), t('homePage.filters.periodTo')]}
            value={filters.periodRange}
            onChange={(value) =>
              updateFilters({
                periodRange: value as [Dayjs | null, Dayjs | null] | null,
              })
            }
          />

          <Select
            style={{ minWidth: 180 }}
            value={filters.applicationScope}
            options={applicationScopeOptions}
            onChange={(value) => updateFilters({ applicationScope: value })}
          />

          {hasActiveDashboardFilters(filters) && (
            <Button onClick={onReset}>{t('homePage.filters.reset')}</Button>
          )}
        </Space>

        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          style={pageToolbarActionStyle}
          onClick={onRefresh}
        >
          {t('homePage.filters.refresh')}
        </Button>
      </div>
    </Card>
  )
}
