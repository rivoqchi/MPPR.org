import { Checkbox, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { PagePermission } from '@/entities/role/model/types'
import { PERMISSION_PAGES } from '@/shared/config/permission-pages'

interface RolePermissionsTableProps {
  value: PagePermission[]
  onChange: (permissions: PagePermission[]) => void
}

type PermissionRow = PagePermission & {
  labelKey: string
}

export function RolePermissionsTable({ value, onChange }: RolePermissionsTableProps) {
  const { t } = useTranslation()

  const rows: PermissionRow[] = PERMISSION_PAGES.map((page) => {
    const permission = value.find((item) => item.pageKey === page.key)

    return {
      pageKey: page.key,
      labelKey: page.labelKey,
      canView: permission?.canView ?? false,
      canCreate: permission?.canCreate ?? false,
      canEdit: permission?.canEdit ?? false,
      canDelete: permission?.canDelete ?? false,
    }
  })

  const updatePermission = (
    pageKey: string,
    field: keyof Pick<PagePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete'>,
    checked: boolean,
  ) => {
    onChange(
      rows.map((row) => {
        if (row.pageKey !== pageKey) {
          const existing = value.find((item) => item.pageKey === row.pageKey)
          return {
            pageKey: row.pageKey,
            canView: existing?.canView ?? false,
            canCreate: existing?.canCreate ?? false,
            canEdit: existing?.canEdit ?? false,
            canDelete: existing?.canDelete ?? false,
          }
        }

        const next = {
          pageKey: row.pageKey,
          canView: field === 'canView' ? checked : row.canView,
          canCreate: field === 'canCreate' ? checked : row.canCreate,
          canEdit: field === 'canEdit' ? checked : row.canEdit,
          canDelete: field === 'canDelete' ? checked : row.canDelete,
        }

        if (field === 'canView' && !checked) {
          return {
            ...next,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }
        }

        if (field !== 'canView' && checked) {
          return {
            ...next,
            canView: true,
          }
        }

        return next
      }),
    )
  }

  const columns: ColumnsType<PermissionRow> = [
    {
      title: t('roles.permissions.page'),
      dataIndex: 'labelKey',
      key: 'labelKey',
      render: (labelKey: string) => t(labelKey),
    },
    {
      title: t('roles.permissions.view'),
      key: 'canView',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={record.canView}
          onChange={(event) => updatePermission(record.pageKey, 'canView', event.target.checked)}
        />
      ),
    },
    {
      title: t('roles.permissions.create'),
      key: 'canCreate',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={record.canCreate}
          disabled={!record.canView}
          onChange={(event) => updatePermission(record.pageKey, 'canCreate', event.target.checked)}
        />
      ),
    },
    {
      title: t('roles.permissions.edit'),
      key: 'canEdit',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={record.canEdit}
          disabled={!record.canView}
          onChange={(event) => updatePermission(record.pageKey, 'canEdit', event.target.checked)}
        />
      ),
    },
    {
      title: t('roles.permissions.delete'),
      key: 'canDelete',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={record.canDelete}
          disabled={!record.canView}
          onChange={(event) => updatePermission(record.pageKey, 'canDelete', event.target.checked)}
        />
      ),
    },
  ]

  return (
    <Table<PermissionRow>
      rowKey="pageKey"
      columns={columns}
      dataSource={rows}
      pagination={false}
      size="middle"
      scroll={{ x: 720 }}
    />
  )
}
