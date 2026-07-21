import { CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Input, Result, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ErrorLog, ErrorLogSeverity, ErrorLogSource } from '@/entities/error-log/model/types'
import {
  formatErrorLogTime,
  formatResolvedErrorHint,
  formatResolvedErrorMessage,
} from '@/features/error-logs/lib/error-log-display'
import { ErrorLogDetailDrawer } from '@/features/error-logs/ui/ErrorLogDetailDrawer'
import { ErrorLogsPageSkeleton } from '@/features/error-logs/ui/ErrorLogsPageSkeleton'
import { fetchErrorLogs, resolveErrorLog } from '@/shared/api/error-logs-api'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { TABLE_PAGE_SIZE } from '@/shared/lib/constants'
import { pageToolbarActionStyle, pageToolbarStyle, scrollablePageStyle } from '@/shared/lib/page-layout'

export function ErrorLogsPage() {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const { canView, canEdit } = useRolePermissions()
  const pageKey = '/management/errors'

  const [items, setItems] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [sourceFilter, setSourceFilter] = useState<ErrorLogSource | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<ErrorLogSeverity | 'all'>('all')
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadErrorLogs = useCallback(async () => {
    if (!canView(pageKey)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const data = await fetchErrorLogs({
        page,
        limit: TABLE_PAGE_SIZE,
        search: searchValue.trim() || undefined,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        severity: severityFilter === 'all' ? undefined : severityFilter,
        resolved:
          resolvedFilter === 'all' ? undefined : resolvedFilter === 'resolved' ? true : false,
      })

      setItems(data.items)
      setTotal(data.meta.total)
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsLoading(false)
    }
  }, [
    canView,
    notifyApiError,
    page,
    resolvedFilter,
    searchValue,
    severityFilter,
    sourceFilter,
  ])

  useEffect(() => {
    void loadErrorLogs()
  }, [loadErrorLogs])

  useEffect(() => {
    setPage(1)
  }, [searchValue, sourceFilter, severityFilter, resolvedFilter])

  const handleResolve = useCallback(
    async (errorLog: ErrorLog) => {
      try {
        const updated = await resolveErrorLog(errorLog.id)
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setSelectedError((current) => (current?.id === updated.id ? updated : current))
        notification.success({ message: t('errorLogsPage.messages.resolved') })
      } catch (error) {
        notifyApiError(error)
      }
    },
    [notification, notifyApiError, t],
  )

  const columns = useMemo<ColumnsType<ErrorLog>>(
    () => [
      {
        title: t('errorLogsPage.columns.time'),
        dataIndex: 'createdAt',
        width: 170,
        render: (value: string) => formatErrorLogTime(value),
      },
      {
        title: t('errorLogsPage.columns.source'),
        dataIndex: 'source',
        width: 110,
        render: (value: ErrorLogSource) => t(`errorLogsPage.source.${value}`),
      },
      {
        title: t('errorLogsPage.columns.severity'),
        dataIndex: 'severity',
        width: 110,
        render: (value: ErrorLogSeverity) => (
          <Tag color={value === 'system' ? 'red' : 'orange'}>
            {t(`errorLogsPage.severity.${value}`)}
          </Tag>
        ),
      },
      {
        title: t('errorLogsPage.columns.code'),
        dataIndex: 'code',
        width: 180,
        ellipsis: true,
        render: (value?: string | null) => value ?? '—',
      },
      {
        title: t('errorLogsPage.columns.message'),
        dataIndex: 'message',
        ellipsis: true,
        render: (_value, record) => formatResolvedErrorMessage(record, t),
      },
      {
        title: t('errorLogsPage.columns.actor'),
        key: 'actor',
        width: 180,
        ellipsis: true,
        render: (_value, record) => {
          const name =
            record.userFullName ??
            (record.user ? `${record.user.firstName} ${record.user.lastName}`.trim() : null)

          if (!name) {
            return t('errorLogsPage.detail.unknownActor')
          }

          return (
            <Space direction="vertical" size={0}>
              <Typography.Text>{name}</Typography.Text>
              {record.userPhone || record.user?.phone ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {record.userPhone ?? record.user?.phone}
                </Typography.Text>
              ) : null}
            </Space>
          )
        },
      },
      {
        title: t('errorLogsPage.columns.route'),
        dataIndex: 'route',
        width: 180,
        ellipsis: true,
        render: (value?: string | null) =>
          value ? (
            <Link to={value} onClick={(event) => event.stopPropagation()}>
              {value}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        title: t('errorLogsPage.columns.solution'),
        key: 'solution',
        width: 220,
        ellipsis: true,
        render: (_value, record) => formatResolvedErrorHint(record, t),
      },
      ...(canEdit(pageKey)
        ? [
            {
              title: t('errorLogsPage.columns.actions'),
              key: 'actions',
              width: 120,
              fixed: 'right' as const,
              render: (_value: unknown, record: ErrorLog) =>
                !record.resolved ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleResolve(record)
                    }}
                  >
                    {t('errorLogsPage.actions.resolve')}
                  </Button>
                ) : null,
            },
          ]
        : []),
    ],
    [canEdit, handleResolve, pageKey, t],
  )

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1)
  }

  if (!canView(pageKey)) {
    return (
      <div style={scrollablePageStyle}>
        <Result status="403" title={t('errorLogsPage.forbiddenTitle')} subTitle={t('errorLogsPage.forbiddenDescription')} />
      </div>
    )
  }

  if (isLoading && items.length === 0) {
    return (
      <div style={scrollablePageStyle}>
        <ErrorLogsPageSkeleton />
      </div>
    )
  }

  return (
    <div style={scrollablePageStyle}>
      <div style={pageToolbarStyle}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('errorLogsPage.title')}
          </Typography.Title>
        </div>
        <div style={pageToolbarActionStyle}>
          <Button icon={<ReloadOutlined />} onClick={() => void loadErrorLogs()}>
            {t('errorLogsPage.actions.refresh')}
          </Button>
        </div>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder={t('errorLogsPage.filters.search')}
          style={{ width: 280 }}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <Select
          value={sourceFilter}
          style={{ width: 160 }}
          onChange={setSourceFilter}
          options={[
            { value: 'all', label: t('errorLogsPage.filters.allSources') },
            { value: 'api', label: t('errorLogsPage.source.api') },
            { value: 'frontend', label: t('errorLogsPage.source.frontend') },
            { value: 'route', label: t('errorLogsPage.source.route') },
          ]}
        />
        <Select
          value={severityFilter}
          style={{ width: 160 }}
          onChange={setSeverityFilter}
          options={[
            { value: 'all', label: t('errorLogsPage.filters.allSeverities') },
            { value: 'user', label: t('errorLogsPage.severity.user') },
            { value: 'system', label: t('errorLogsPage.severity.system') },
          ]}
        />
        <Select
          value={resolvedFilter}
          style={{ width: 180 }}
          onChange={setResolvedFilter}
          options={[
            { value: 'all', label: t('errorLogsPage.filters.allStatuses') },
            { value: 'open', label: t('errorLogsPage.filters.open') },
            { value: 'resolved', label: t('errorLogsPage.filters.resolved') },
          ]}
        />
      </Space>

      <Table<ErrorLog>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize: TABLE_PAGE_SIZE,
          total,
          showSizeChanger: false,
        }}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => {
            setSelectedError(record)
            setDrawerOpen(true)
          },
          style: { cursor: 'pointer' },
        })}
      />

      <ErrorLogDetailDrawer
        open={drawerOpen}
        errorLog={selectedError}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedError(null)
        }}
      />
    </div>
  )
}
