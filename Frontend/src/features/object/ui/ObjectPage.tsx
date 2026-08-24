import { PlusOutlined } from '@ant-design/icons'
import { Button, Input, Select, Space, Table, Tag, theme } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegisteredObject } from '@/entities/object/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import {
  applyObjectFilters,
  getObjectFilterOptions,
} from '@/features/object/lib/filter-objects'
import { ObjectDetail } from '@/features/object/ui/ObjectDetail'
import { ObjectDrawer } from '@/features/object/ui/ObjectDrawer'
import { ObjectPageSkeleton } from '@/features/object/ui/ObjectPageSkeleton'
import { TABLE_PAGE_SIZE } from '@/shared/lib/constants'
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

export function ObjectPage() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const objects = useObjectsStore((state) => state.objects)
  const isObjectsHydrated = useObjectsStore((state) => state.isHydrated)
  const deleteObject = useObjectsStore((state) => state.deleteObject)
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const pageKey = '/registration/objects'
  const canAdd = canCreate(pageKey)
  const canModify = canEdit(pageKey)
  const canRemove = canDelete(pageKey)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingObject, setEditingObject] = useState<RegisteredObject | null>(null)
  const [selectedObjectId, setSelectedObjectId] = useState<string>()
  const [searchValue, setSearchValue] = useState('')
  const [shortNameFilter, setShortNameFilter] = useState<string>()
  const [originalNameFilter, setOriginalNameFilter] = useState<string>()
  const [page, setPage] = useState(1)

  const filterOptions = useMemo(() => getObjectFilterOptions(objects), [objects])

  const filteredObjects = useMemo(
    () =>
      applyObjectFilters(objects, {
        search: searchValue,
        shortName: shortNameFilter,
        originalName: originalNameFilter,
      }),
    [objects, searchValue, shortNameFilter, originalNameFilter],
  )

  const activeObjectId = selectedObjectId ?? filteredObjects[0]?.id

  const selectedObject = useMemo(
    () => objects.find((item) => item.id === activeObjectId),
    [activeObjectId, objects],
  )

  useEffect(() => {
    setPage(1)
  }, [searchValue, shortNameFilter, originalNameFilter])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredObjects.length / TABLE_PAGE_SIZE))

    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filteredObjects.length, page])

  const columns = useMemo<ColumnsType<RegisteredObject>>(
    () => [
      {
        title: '#',
        width: 64,
        render: (_, __, index) => (page - 1) * TABLE_PAGE_SIZE + index + 1,
      },
      {
        title: t('object.columns.originalName'),
        dataIndex: 'originalName',
        key: 'originalName',
        ellipsis: true,
      },
      {
        title: t('object.columns.shortName'),
        dataIndex: 'shortName',
        key: 'shortName',
        width: 140,
        render: (value: string) => <Tag color="blue">{value}</Tag>,
      },
      {
        title: t('object.columns.address'),
        key: 'address',
        ellipsis: true,
        render: (_, record) => record.location.address,
      },
      {
        title: t('object.columns.documents'),
        dataIndex: 'documents',
        key: 'documents',
        width: 120,
        align: 'center',
        render: (documents: RegisteredObject['documents']) => documents.length,
      },
    ],
    [page, t],
  )

  const pagination = useMemo<TablePaginationConfig>(
    () => ({
      current: page,
      pageSize: TABLE_PAGE_SIZE,
      total: filteredObjects.length,
      showSizeChanger: false,
      onChange: setPage,
    }),
    [filteredObjects.length, page],
  )

  const handleOpenCreate = () => {
    setEditingObject(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (object: RegisteredObject) => {
    setEditingObject(object)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingObject(null)
  }

  const handleSaved = () => {
    handleCloseDrawer()
  }

  const handleDelete = async (id: string) => {
    const deleted = await deleteObject(id)

    if (deleted && selectedObjectId === id) {
      setSelectedObjectId(undefined)
    }
  }

  const handleResetFilters = () => {
    setSearchValue('')
    setShortNameFilter(undefined)
    setOriginalNameFilter(undefined)
  }

  const hasActiveFilters = Boolean(searchValue || shortNameFilter || originalNameFilter)

  if (!isObjectsHydrated) {
    return <ObjectPageSkeleton />
  }

  return (
    <RequirePageView pageKey={pageKey}>
    <>
      <div style={fullHeightPageStyle}>
        <div style={pageToolbarStyle}>
            <Space wrap>
              <Input.Search
                allowClear
                placeholder={t('object.filters.search')}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onSearch={setSearchValue}
                style={{ minWidth: 280 }}
              />
              <Select<string>
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t('object.filters.shortName')}
                value={shortNameFilter}
                onChange={setShortNameFilter}
                options={filterOptions.shortNames}
                style={{ minWidth: 200 }}
              />
              <Select<string>
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t('object.filters.originalName')}
                value={originalNameFilter}
                onChange={setOriginalNameFilter}
                options={filterOptions.originalNames}
                style={{ minWidth: 280 }}
              />
              {hasActiveFilters && (
                <Button onClick={handleResetFilters}>{t('object.filters.reset')}</Button>
              )}
            </Space>

            {canAdd && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={pageToolbarActionStyle}
                onClick={handleOpenCreate}
              >
                {t('object.add')}
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
              <Table<RegisteredObject>
                rowKey="id"
                columns={columns}
                dataSource={filteredObjects}
                pagination={pagination}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: activeObjectId ? [activeObjectId] : [],
                  onChange: (keys) => setSelectedObjectId(keys[0] as string),
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedObjectId(record.id),
                  style: { cursor: 'pointer' },
                })}
              />
            </div>
          </div>

      <div style={{ ...splitPanelShellStyle, flex: 1 }}>
            <ObjectDetail
              object={selectedObject}
              canManage={canModify || canRemove}
              onEdit={
                canModify && selectedObject
                  ? () => handleOpenEdit(selectedObject)
                  : undefined
              }
              onDelete={
                canRemove && selectedObject
                  ? () => handleDelete(selectedObject.id)
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {(canAdd || canModify) && (
        <ObjectDrawer
          key={editingObject?.id ?? 'create'}
          open={drawerOpen}
          editingObject={editingObject}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      )}
    </>
    </RequirePageView>
  )
}
