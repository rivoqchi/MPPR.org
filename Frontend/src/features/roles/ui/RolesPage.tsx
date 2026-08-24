import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Input, Popconfirm, Space, Table } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Role } from '@/entities/role/model/types'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { RoleDrawer } from '@/features/roles/ui/RoleDrawer'
import { RolesPageSkeleton } from '@/features/roles/ui/RolesPageSkeleton'
import { TABLE_PAGE_SIZE } from '@/shared/lib/constants'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { pageToolbarActionStyle, pageToolbarStyle, scrollablePageStyle } from '@/shared/lib/page-layout'
import { RequirePageView } from '@/shared/ui/RequirePageView'

export function RolesPage() {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError, notifyLocalizedError } = useNotifyApiError()
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const pageKey = '/management/roles'
  const isRolesHydrated = useRolesStore((state) => state.isHydrated)
  const isUsersHydrated = useUsersStore((state) => state.isHydrated)
  const roles = useRolesStore((state) => state.roles)
  const deleteRole = useRolesStore((state) => state.deleteRole)
  const users = useUsersStore((state) => state.users)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    if (!normalizedSearch) {
      return roles
    }

    return roles.filter((role) => {
      const haystack = [role.name, role.description].join(' ').toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [roles, searchValue])

  useEffect(() => {
    setPage(1)
  }, [searchValue])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredRoles.length / TABLE_PAGE_SIZE))

    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filteredRoles.length, page])

  const paginatedRoles = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE
    return filteredRoles.slice(start, start + TABLE_PAGE_SIZE)
  }, [filteredRoles, page])

  const getAssignedUsersCount = (roleId: string) =>
    users.filter((user) => user.roleId === roleId).length

  const handleDelete = async (role: Role) => {
    const assignedCount = getAssignedUsersCount(role.id)

    if (assignedCount > 0) {
      notifyLocalizedError('roles.messages.deleteAssigned', 'api.errors.categories.user', {
        count: assignedCount,
      })
      return
    }

    try {
      const deleted = await deleteRole(role.id)

      if (!deleted) {
        notifyLocalizedError('roles.messages.deleteSystem', 'api.errors.categories.system')
        return
      }

      notification.success({
        message: t('roles.messages.deleted'),
      })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'roles.messages.error' })
    }
  }

  const columns = useMemo<ColumnsType<Role>>(
    () => [
      {
        title: '#',
        width: 64,
        render: (_, __, index) => (page - 1) * TABLE_PAGE_SIZE + index + 1,
      },
      {
        title: t('roles.columns.name'),
        dataIndex: 'name',
        key: 'name',
        width: 160,
        ellipsis: true,
      },
      {
        title: t('roles.columns.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: t('roles.columns.documents'),
        dataIndex: 'documents',
        key: 'documents',
        width: 110,
        align: 'center',
        onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        render: (documents: Role['documents']) => documents.length,
      },
      {
        title: t('roles.columns.users'),
        key: 'users',
        width: 148,
        align: 'center',
        onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        render: (_, record) => getAssignedUsersCount(record.id),
      },
      {
        title: t('roles.columns.actions'),
        key: 'actions',
        width: 260,
        fixed: 'right',
        align: 'right',
        onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        render: (_, record) => (
          <Space size={4} wrap={false}>
            {canEdit(pageKey) && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingRole(record)
                  setDrawerOpen(true)
                }}
              >
                {t('roles.edit')}
              </Button>
            )}
            {!record.isSystem && canDelete(pageKey) && (
              <Popconfirm
                title={t('roles.deleteConfirm')}
                onConfirm={() => handleDelete(record)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  {t('common.delete')}
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [page, t, users, canEdit, canDelete, pageKey],
  )

  const pagination = useMemo<TablePaginationConfig>(
    () => ({
      current: page,
      pageSize: TABLE_PAGE_SIZE,
      total: filteredRoles.length,
      showSizeChanger: false,
      onChange: setPage,
    }),
    [filteredRoles.length, page],
  )

  if (!isRolesHydrated || !isUsersHydrated) {
    return <RolesPageSkeleton />
  }

  return (
    <RequirePageView pageKey={pageKey}>
    <div style={scrollablePageStyle}>
      <div style={pageToolbarStyle}>
        <Input.Search
          allowClear
          placeholder={t('roles.filters.search')}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onSearch={setSearchValue}
          style={{ flex: 1, minWidth: 280 }}
        />

        {canCreate(pageKey) && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={pageToolbarActionStyle}
            onClick={() => {
              setEditingRole(null)
              setDrawerOpen(true)
            }}
          >
            {t('roles.add')}
          </Button>
        )}
      </div>

      <Table<Role>
        rowKey="id"
        columns={columns}
        dataSource={paginatedRoles}
        pagination={pagination}
        scroll={{ x: 960 }}
        tableLayout="fixed"
      />

      {(canCreate(pageKey) || canEdit(pageKey)) && (
        <RoleDrawer
          key={editingRole?.id ?? 'create'}
          open={drawerOpen}
          editingRole={editingRole}
          onClose={() => {
            setDrawerOpen(false)
            setEditingRole(null)
          }}
          onSaved={() => {
            setDrawerOpen(false)
            setEditingRole(null)
          }}
        />
      )}
    </div>
    </RequirePageView>
  )
}
