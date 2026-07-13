import { EyeOutlined } from '@ant-design/icons'
import { Button, DatePicker, Input, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { PprCalendarMonth } from '@/entities/ppr-calendar/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import {
  buildApprovedMonthsQuery,
  defaultPprManagementFilters,
  hasActivePprManagementFilters,
  type PprManagementFilters,
  type PprManagementScopeValue,
} from '@/features/ppr-management/lib/ppr-management-filters'
import { fetchApprovedPprCalendarMonths } from '@/shared/api/ppr-calendar-api'
import { TABLE_PAGE_SIZE } from '@/shared/lib/constants'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { pageToolbarActionStyle, pageToolbarStyle, scrollablePageStyle } from '@/shared/lib/page-layout'

const { RangePicker } = DatePicker

export function PprManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notifyApiError } = useNotifyApiError()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

  const [months, setMonths] = useState<PprCalendarMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<PprManagementFilters>(defaultPprManagementFilters)
  const [page, setPage] = useState(1)

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
    const options: Array<{ value: PprManagementScopeValue; label: string }> = [
      { value: 'all', label: t('pprManagement.filters.scopeAll') },
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

  const loadMonths = useCallback(async () => {
    setLoading(true)

    try {
      const data = await fetchApprovedPprCalendarMonths(buildApprovedMonthsQuery(filters))
      setMonths(data)
    } catch (error) {
      notifyApiError(error)
      setMonths([])
    } finally {
      setLoading(false)
    }
  }, [filters, notifyApiError])

  useEffect(() => {
    void loadMonths()
  }, [loadMonths])

  useEffect(() => {
    if (!filters.scopeValue.startsWith('section:')) {
      return
    }

    const sectionId = filters.scopeValue.replace('section:', '')
    const unit = structuralUnits.find((item) => item.id === filters.structuralUnitId)

    if (!unit?.sections.some((section) => section.id === sectionId)) {
      setFilters((current) => ({ ...current, scopeValue: 'all' }))
    }
  }, [filters.scopeValue, filters.structuralUnitId, structuralUnits])

  const filteredMonths = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    if (!normalizedSearch) {
      return months
    }

    return months.filter((month) => {
      const unit = structuralUnits.find((item) => item.id === month.structuralUnitId)
      const section = unit?.sections.find((item) => item.id === month.sectionId)
      const haystack = [
        unit?.shortName,
        unit?.originalName,
        section?.shortName,
        String(month.year),
        String(month.month),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [months, searchValue, structuralUnits])

  useEffect(() => {
    setPage(1)
  }, [searchValue, filters])

  const paginatedMonths = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE
    return filteredMonths.slice(start, start + TABLE_PAGE_SIZE)
  }, [filteredMonths, page])

  const handleUnitChange = (value: string | undefined) => {
    setFilters((current) => ({
      ...current,
      structuralUnitId: value,
    }))
  }

  const handleScopeChange = (value: PprManagementScopeValue) => {
    setFilters((current) => ({
      ...current,
      scopeValue: value,
    }))
  }

  const handlePeriodChange = (values: [Dayjs | null, Dayjs | null] | null) => {
    setFilters((current) => ({
      ...current,
      periodRange: values,
    }))
  }

  const handleResetFilters = () => {
    setFilters(defaultPprManagementFilters)
    setSearchValue('')
  }

  const hasActiveFilters =
    hasActivePprManagementFilters(filters) || Boolean(searchValue.trim())

  const columns = useMemo<ColumnsType<PprCalendarMonth>>(
    () => [
      {
        title: '#',
        width: 64,
        render: (_, __, index) => (page - 1) * TABLE_PAGE_SIZE + index + 1,
      },
      {
        title: t('pprManagement.columns.period'),
        key: 'period',
        width: 160,
        render: (_, record) =>
          `${t(`pprCalendar.months.${record.month - 1}`)} ${record.year}`,
      },
      {
        title: t('pprManagement.columns.unit'),
        key: 'unit',
        ellipsis: true,
        render: (_, record) => {
          const unit = structuralUnits.find((item) => item.id === record.structuralUnitId)
          return unit?.shortName ?? record.structuralUnitId
        },
      },
      {
        title: t('pprManagement.columns.scope'),
        key: 'scope',
        width: 180,
        render: (_, record) => {
          if (!record.sectionId) {
            return <Tag color="purple">{t('pprCalendar.scope.structure')}</Tag>
          }

          const unit = structuralUnits.find((item) => item.id === record.structuralUnitId)
          const section = unit?.sections.find((item) => item.id === record.sectionId)

          return (
            <Tag color="blue">
              {section?.shortName ?? t('pprCalendar.scope.section')}
            </Tag>
          )
        },
      },
      {
        title: t('pprManagement.columns.entries'),
        key: 'entries',
        width: 110,
        align: 'center',
        render: (_, record) => record.entries.length,
      },
      {
        title: t('pprManagement.columns.approvedAt'),
        key: 'approvedAt',
        width: 170,
        render: (_, record) =>
          record.approvedAt ? dayjs(record.approvedAt).format('DD.MM.YYYY HH:mm') : '—',
      },
      {
        title: t('pprManagement.columns.actions'),
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/management/ppr/${record.id}`)}
          >
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [navigate, page, structuralUnits, t],
  )

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: TABLE_PAGE_SIZE,
    total: filteredMonths.length,
    showSizeChanger: false,
    onChange: setPage,
  }

  return (
    <div style={scrollablePageStyle}>
      <div style={pageToolbarStyle}>
        <Space wrap size="middle">
          <Input.Search
            allowClear
            placeholder={t('pprManagement.search')}
            style={{ minWidth: 200, width: 220 }}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 160, width: 170 }}
            placeholder={t('pprManagement.filters.structuralUnit')}
            value={filters.structuralUnitId}
            options={structuralUnitOptions}
            onChange={handleUnitChange}
          />
          <Select<PprManagementScopeValue>
            style={{ minWidth: 160, width: 180 }}
            value={filters.scopeValue}
            options={scopeOptions}
            onChange={handleScopeChange}
          />
          <RangePicker
            picker="month"
            allowEmpty={[true, true]}
            format="MM.YYYY"
            style={{ width: 240 }}
            placeholder={[t('pprManagement.filters.periodFrom'), t('pprManagement.filters.periodTo')]}
            value={filters.periodRange}
            onChange={handlePeriodChange}
          />
          {hasActiveFilters ? (
            <Button onClick={handleResetFilters}>{t('pprManagement.filters.reset')}</Button>
          ) : null}
        </Space>

        <Button style={pageToolbarActionStyle} onClick={() => void loadMonths()}>
          {t('common.refresh')}
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={paginatedMonths}
        pagination={pagination}
        scroll={{ x: 980 }}
        locale={{ emptyText: t('pprManagement.empty') }}
        onRow={(record) => ({
          onDoubleClick: () => navigate(`/management/ppr/${record.id}`),
        })}
      />
    </div>
  )
}
