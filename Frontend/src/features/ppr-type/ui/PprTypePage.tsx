import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprShortName, PprType } from '@/entities/ppr-type/model/types'
import { PPR_SHORT_NAMES } from '@/entities/ppr-type/model/types'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import {
  applyPprTypeFilters,
  filterPprTypesByStructuralUnit,
  getOriginalNameFilterOptions,
} from '@/features/ppr-type/lib/filter-ppr-types'
import { PprTypeDetailModal } from '@/features/ppr-type/ui/PprTypeDetailModal'
import { PprTypeDrawer } from '@/features/ppr-type/ui/PprTypeDrawer'
import { PprTypePageSkeleton } from '@/features/ppr-type/ui/PprTypePageSkeleton'
import { HighlightText } from '@/shared/ui/HighlightText'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { scrollablePageStyle, pageToolbarActionStyle, pageToolbarStyle } from '@/shared/lib/page-layout'

const { Text } = Typography
const PAGE_KEY = '/registration/ppr-type'

export function PprTypePage() {
  const { t } = useTranslation()
  const pprTypes = usePprTypesStore((state) => state.pprTypes)
  const isPprTypesHydrated = usePprTypesStore((state) => state.isHydrated)
  const { currentUser, users, canViewAll } = useStructuralUnitScope()
  const { canCreate, canEdit } = useRolePermissions()
  const canAdd = canCreate(PAGE_KEY)
  const canModify = canEdit(PAGE_KEY)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPprType, setSelectedPprType] = useState<PprType | null>(null)
  const [editingPprType, setEditingPprType] = useState<PprType | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [shortNameFilter, setShortNameFilter] = useState<PprShortName>()
  const [originalNameFilter, setOriginalNameFilter] = useState<string>()

  const roleScopedPprTypes = useMemo(
    () =>
      filterPprTypesByStructuralUnit(
        pprTypes,
        currentUser,
        users,
        canViewAll,
      ),
    [pprTypes, currentUser, users, canViewAll],
  )

  const originalNameOptions = useMemo(
    () => getOriginalNameFilterOptions(roleScopedPprTypes),
    [roleScopedPprTypes],
  )

  const showOwnerColumn = canViewAll

  const getOwnerLabel = useCallback(
    (userId?: string) => {
      if (!userId) {
        return t('pprType.owner.unknown')
      }

      if (userId === currentUser?.id) {
        return t('pprType.owner.self')
      }

      const owner = users.find((user) => user.id === userId)

      return owner ? getUserFullName(owner) : t('pprType.owner.unknown')
    },
    [currentUser?.id, t, users],
  )

  const filteredPprTypes = useMemo(
    () =>
      applyPprTypeFilters(
        roleScopedPprTypes,
        {
          shortName: shortNameFilter,
          originalName: originalNameFilter,
          search: searchValue,
        },
        { getOwnerLabel },
      ),
    [getOwnerLabel, originalNameFilter, roleScopedPprTypes, searchValue, shortNameFilter],
  )

  const hasActiveFilters = Boolean(searchValue || shortNameFilter || originalNameFilter)

  const columns = useMemo<ColumnsType<PprType>>(
    () => [
      {
        title: '#',
        width: 64,
        render: (_, __, index) => index + 1,
      },
      {
        title: t('pprType.columns.originalName'),
        dataIndex: 'originalName',
        key: 'originalName',
        render: (value: string) => <HighlightText text={value} query={searchValue} />,
      },
      {
        title: t('pprType.columns.shortName'),
        dataIndex: 'shortName',
        key: 'shortName',
        width: 120,
        render: (value: PprType['shortName']) => (
          <Tag color="blue">
            <HighlightText text={value} query={searchValue} />
          </Tag>
        ),
      },
      {
        title: t('pprType.columns.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (value: string) => (
          <Text type="secondary">
            <HighlightText text={value} query={searchValue} />
          </Text>
        ),
      },
      ...(showOwnerColumn
        ? [
            {
              title: t('pprType.columns.owner'),
              key: 'owner',
              width: 200,
              render: (_: unknown, record: PprType) => (
                <HighlightText
                  text={getOwnerLabel(record.createdByUserId)}
                  query={searchValue}
                />
              ),
            } satisfies ColumnsType<PprType>[number],
          ]
        : []),
      {
        title: t('pprType.columns.files'),
        dataIndex: 'files',
        key: 'files',
        width: 120,
        align: 'center',
        render: (files: PprType['files']) => files.length,
      },
      {
        title: t('pprType.columns.actions'),
        key: 'actions',
        width: 120,
        align: 'center',
        render: (_, record) =>
          canModify ? (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              setSelectedPprType(null)
              setDetailOpen(false)
              setEditingPprType(record)
              setDrawerOpen(true)
            }}
          >
            {t('pprType.edit')}
          </Button>
          ) : null,
      },
    ],
    [canModify, getOwnerLabel, searchValue, showOwnerColumn, t],
  )

  const handleOpenCreate = () => {
    setEditingPprType(null)
    setDetailOpen(false)
    setSelectedPprType(null)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingPprType(null)
  }

  const handleOpenDetail = (record: PprType) => {
    setSelectedPprType(record)
    setDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailOpen(false)
    setSelectedPprType(null)
  }

  const handleEditFromDetail = () => {
    if (!selectedPprType) {
      return
    }

    setEditingPprType(selectedPprType)
    setDetailOpen(false)
    setDrawerOpen(true)
  }

  const handleResetFilters = () => {
    setSearchValue('')
    setShortNameFilter(undefined)
    setOriginalNameFilter(undefined)
  }

  const handleSaved = () => {
    handleCloseDrawer()
  }

  if (!isPprTypesHydrated) {
    return <PprTypePageSkeleton />
  }

  return (
    <RequirePageView pageKey={PAGE_KEY}>
    <div style={scrollablePageStyle}>
      <div style={pageToolbarStyle}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder={t('pprType.filters.search')}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onSearch={setSearchValue}
            style={{ minWidth: 280 }}
          />
          <Select<PprShortName>
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('pprType.filters.shortName')}
            value={shortNameFilter}
            onChange={setShortNameFilter}
            options={PPR_SHORT_NAMES.map((name) => ({
              value: name,
              label: name,
            }))}
            style={{ minWidth: 220 }}
          />
          <Select<string>
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('pprType.filters.originalName')}
            value={originalNameFilter}
            onChange={setOriginalNameFilter}
            options={originalNameOptions}
            style={{ minWidth: 280 }}
          />
          {hasActiveFilters && (
            <Button onClick={handleResetFilters}>{t('pprType.filters.reset')}</Button>
          )}
        </Space>

        {canAdd && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={pageToolbarActionStyle}
            onClick={handleOpenCreate}
          >
            {t('pprType.add')}
          </Button>
        )}
      </div>

      <Table<PprType>
        rowKey="id"
        columns={columns}
        dataSource={filteredPprTypes}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => handleOpenDetail(record),
          style: { cursor: 'pointer' },
        })}
      />

      <PprTypeDetailModal
        open={detailOpen}
        pprType={selectedPprType}
        searchQuery={searchValue}
        showOwner={showOwnerColumn}
        ownerLabel={
          selectedPprType ? getOwnerLabel(selectedPprType.createdByUserId) : undefined
        }
        onClose={handleCloseDetail}
        onEdit={canModify ? handleEditFromDetail : undefined}
      />

      {(canAdd || canModify) && (
        <PprTypeDrawer
          open={drawerOpen}
          editingPprType={editingPprType}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      )}
    </div>
    </RequirePageView>
  )
}
