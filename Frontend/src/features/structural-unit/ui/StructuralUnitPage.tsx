import { PlusOutlined } from '@ant-design/icons'
import { App, Button, Input, Select, Space, Table, Tag, theme } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StructuralUnit, StructuralUnitSection } from '@/entities/structural-unit/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import {
  applyStructuralUnitFilters,
  getStructuralUnitFilterOptions,
} from '@/features/structural-unit/lib/filter-structural-units'
import {
  fullHeightPageStyle,
  getSplitPanelSurfaceStyle,
  pageToolbarActionStyle,
  pageToolbarStyle,
  splitPagePrimaryPanelStyle,
  splitPageRowStyle,
  splitPanelScrollStyle,
  splitPanelShellStyle,
} from '@/shared/lib/page-layout'
import { StructuralUnitDetail } from '@/features/structural-unit/ui/StructuralUnitDetail'
import { StructuralUnitDrawer } from '@/features/structural-unit/ui/StructuralUnitDrawer'
import { StructuralUnitPageSkeleton } from '@/features/structural-unit/ui/StructuralUnitPageSkeleton'
import { StructuralUnitSectionDrawer } from '@/features/structural-unit/ui/StructuralUnitSectionDrawer'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { RequirePageView } from '@/shared/ui/RequirePageView'

const STRUCTURAL_UNIT_TABLE_PAGE_SIZE = 10

export function StructuralUnitPage() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const pageKey = '/registration/structural-units'
  const isStructuralUnitsHydrated = useStructuralUnitsStore((state) => state.isHydrated)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const removeStructuralUnit = useStructuralUnitsStore((state) => state.removeStructuralUnit)
  const isUsersHydrated = useUsersStore((state) => state.isHydrated)
  const hydrateUsers = useUsersStore((state) => state.hydrate)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingStructuralUnit, setEditingStructuralUnit] = useState<StructuralUnit | null>(null)
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<StructuralUnitSection | null>(null)
  const [selectedStructuralUnitId, setSelectedStructuralUnitId] = useState<string>()
  const [searchValue, setSearchValue] = useState('')
  const [shortNameFilter, setShortNameFilter] = useState<string>()
  const [originalNameFilter, setOriginalNameFilter] = useState<string>()
  const [page, setPage] = useState(1)

  const filterOptions = useMemo(
    () => getStructuralUnitFilterOptions(structuralUnits),
    [structuralUnits],
  )

  const filteredStructuralUnits = useMemo(
    () =>
      applyStructuralUnitFilters(structuralUnits, {
        search: searchValue,
        shortName: shortNameFilter,
        originalName: originalNameFilter,
      }),
    [structuralUnits, searchValue, shortNameFilter, originalNameFilter],
  )

  const activeStructuralUnitId = selectedStructuralUnitId ?? filteredStructuralUnits[0]?.id

  const selectedStructuralUnit = useMemo(
    () => structuralUnits.find((item) => item.id === activeStructuralUnitId),
    [activeStructuralUnitId, structuralUnits],
  )

  useEffect(() => {
    setPage(1)
  }, [searchValue, shortNameFilter, originalNameFilter])

  useEffect(() => {
    if (!isUsersHydrated) {
      void hydrateUsers()
    }
  }, [hydrateUsers, isUsersHydrated])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredStructuralUnits.length / STRUCTURAL_UNIT_TABLE_PAGE_SIZE))

    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filteredStructuralUnits.length, page])

  const columns = useMemo<ColumnsType<StructuralUnit>>(
    () => [
      {
        title: '#',
        width: 64,
        render: (_, __, index) => (page - 1) * STRUCTURAL_UNIT_TABLE_PAGE_SIZE + index + 1,
      },
      {
        title: t('structuralUnit.columns.originalName'),
        dataIndex: 'originalName',
        key: 'originalName',
        ellipsis: true,
      },
      {
        title: t('structuralUnit.columns.shortName'),
        dataIndex: 'shortName',
        key: 'shortName',
        width: 140,
        render: (value: string) => <Tag color="blue">{value}</Tag>,
      },
      {
        title: t('structuralUnit.fields.headUser'),
        dataIndex: 'headFullName',
        key: 'headFullName',
        ellipsis: true,
        render: (value: string) => value?.trim() || '—',
      },
      {
        title: t('structuralUnit.columns.documents'),
        dataIndex: 'documents',
        key: 'documents',
        width: 120,
        align: 'center',
        render: (documents: StructuralUnit['documents']) => documents.length,
      },
      {
        title: t('structuralUnit.columns.sections'),
        dataIndex: 'sections',
        key: 'sections',
        width: 120,
        align: 'center',
        render: (sections: StructuralUnit['sections']) => sections?.length ?? 0,
      },
    ],
    [page, t],
  )

  const pagination = useMemo<TablePaginationConfig>(
    () => ({
      current: page,
      pageSize: STRUCTURAL_UNIT_TABLE_PAGE_SIZE,
      total: filteredStructuralUnits.length,
      showSizeChanger: false,
      onChange: setPage,
    }),
    [filteredStructuralUnits.length, page],
  )

  const handleOpenCreate = () => {
    setEditingStructuralUnit(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (structuralUnit: StructuralUnit) => {
    setEditingStructuralUnit(structuralUnit)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingStructuralUnit(null)
  }

  const handleSaved = () => {
    handleCloseDrawer()
  }

  const handleOpenCreateSection = () => {
    setEditingSection(null)
    setSectionDrawerOpen(true)
  }

  const handleOpenEditSection = (section: StructuralUnitSection) => {
    setEditingSection(section)
    setSectionDrawerOpen(true)
  }

  const handleCloseSectionDrawer = () => {
    setSectionDrawerOpen(false)
    setEditingSection(null)
  }

  const handleSectionSaved = () => {
    handleCloseSectionDrawer()
  }

  const handleDelete = async () => {
    if (!selectedStructuralUnit) {
      return
    }

    const deletedId = selectedStructuralUnit.id

    try {
      await removeStructuralUnit(deletedId)

      if (selectedStructuralUnitId === deletedId) {
        setSelectedStructuralUnitId(undefined)
      }

      notification.success({ message: t('structuralUnit.messages.deleted') })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'structuralUnit.messages.deleteError' })
    }
  }

  const canManageSections = canCreate(pageKey) || canEdit(pageKey)

  const handleResetFilters = () => {
    setSearchValue('')
    setShortNameFilter(undefined)
    setOriginalNameFilter(undefined)
  }

  const hasActiveFilters = Boolean(searchValue || shortNameFilter || originalNameFilter)

  if (!isStructuralUnitsHydrated) {
    return <StructuralUnitPageSkeleton />
  }

  return (
    <RequirePageView pageKey={pageKey}>
    <>
      <div style={fullHeightPageStyle}>
        <div style={pageToolbarStyle}>
            <Space wrap>
              <Input.Search
                allowClear
                placeholder={t('structuralUnit.filters.search')}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onSearch={setSearchValue}
                style={{ minWidth: 280 }}
              />
              <Select<string>
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t('structuralUnit.filters.shortName')}
                value={shortNameFilter}
                onChange={setShortNameFilter}
                options={filterOptions.shortNames}
                style={{ minWidth: 200 }}
              />
              <Select<string>
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t('structuralUnit.filters.originalName')}
                value={originalNameFilter}
                onChange={setOriginalNameFilter}
                options={filterOptions.originalNames}
                style={{ minWidth: 280 }}
              />
              {hasActiveFilters && (
                <Button onClick={handleResetFilters}>{t('structuralUnit.filters.reset')}</Button>
              )}
            </Space>

            {canCreate(pageKey) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={pageToolbarActionStyle}
                onClick={handleOpenCreate}
              >
                {t('structuralUnit.add')}
              </Button>
            )}
        </div>

        <div style={splitPageRowStyle}>
          <div
            style={{
              ...splitPagePrimaryPanelStyle,
              ...getSplitPanelSurfaceStyle(token),
            }}
          >
            <div style={splitPanelScrollStyle}>
              <Table<StructuralUnit>
                rowKey="id"
                columns={columns}
                dataSource={filteredStructuralUnits}
                pagination={pagination}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: activeStructuralUnitId ? [activeStructuralUnitId] : [],
                  onChange: (keys) => setSelectedStructuralUnitId(keys[0] as string),
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedStructuralUnitId(record.id),
                  style: { cursor: 'pointer' },
                })}
              />
            </div>
          </div>

          <div style={{ ...splitPanelShellStyle, flex: 1 }}>
            <StructuralUnitDetail
              structuralUnit={selectedStructuralUnit}
              onEdit={
                canEdit(pageKey) && selectedStructuralUnit
                  ? () => handleOpenEdit(selectedStructuralUnit)
                  : undefined
              }
              onDelete={
                canDelete(pageKey) && selectedStructuralUnit ? () => void handleDelete() : undefined
              }
              canManageSections={canManageSections && Boolean(selectedStructuralUnit)}
              onAddSection={canManageSections ? handleOpenCreateSection : undefined}
              onEditSection={canManageSections ? handleOpenEditSection : undefined}
            />
          </div>
        </div>
      </div>

      {(canCreate(pageKey) || canEdit(pageKey)) && (
        <StructuralUnitDrawer
          key={editingStructuralUnit?.id ?? 'create'}
          open={drawerOpen}
          editingStructuralUnit={editingStructuralUnit}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      )}

      {canManageSections && (
        <StructuralUnitSectionDrawer
          key={editingSection?.id ?? 'create-section'}
          open={sectionDrawerOpen}
          structuralUnitId={selectedStructuralUnit?.id}
          editingSection={editingSection}
          onClose={handleCloseSectionDrawer}
          onSaved={handleSectionSaved}
        />
      )}
    </>
    </RequirePageView>
  )
}
