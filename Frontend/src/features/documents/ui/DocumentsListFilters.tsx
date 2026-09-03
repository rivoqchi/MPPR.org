import { Input, Select, Space } from 'antd'
import { useTranslation } from 'react-i18next'

export type ServiceFileFilter = 'all' | 'service' | 'regular'

interface DocumentsListFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  serviceFilter: ServiceFileFilter
  onServiceFilterChange: (value: ServiceFileFilter) => void
  showServiceFilter?: boolean
  searchPlaceholderKey: string
}

export function DocumentsListFilters({
  searchValue,
  onSearchChange,
  serviceFilter,
  onServiceFilterChange,
  showServiceFilter = true,
  searchPlaceholderKey,
}: DocumentsListFiltersProps) {
  const { t } = useTranslation()

  return (
    <Space wrap style={{ width: '100%', marginBottom: 12 }}>
      <Input.Search
        allowClear
        placeholder={t(searchPlaceholderKey)}
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        onSearch={onSearchChange}
        style={{ minWidth: 280, maxWidth: 420, flex: 1 }}
      />
      {showServiceFilter ? (
        <Select<ServiceFileFilter>
          value={serviceFilter}
          onChange={onServiceFilterChange}
          style={{ minWidth: 220 }}
          options={[
            { value: 'all', label: t('documents.filters.serviceAll') },
            { value: 'service', label: t('documents.filters.serviceYes') },
            { value: 'regular', label: t('documents.filters.serviceNo') },
          ]}
        />
      ) : null}
    </Space>
  )
}

export function matchesDocumentSearch(
  record: { title: string; createdBy: { firstName: string; lastName: string } },
  searchValue: string,
): boolean {
  const normalized = searchValue.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  const uploader = `${record.createdBy.firstName} ${record.createdBy.lastName}`.toLowerCase()
  return record.title.toLowerCase().includes(normalized) || uploader.includes(normalized)
}

export function matchesServiceFileFilter(
  isServiceFile: boolean,
  filter: ServiceFileFilter,
): boolean {
  if (filter === 'service') {
    return isServiceFile
  }
  if (filter === 'regular') {
    return !isServiceFile
  }
  return true
}
