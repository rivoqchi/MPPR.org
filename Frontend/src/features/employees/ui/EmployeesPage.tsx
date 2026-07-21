import { Badge, Card, Col, Empty, Input, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { filterUsersByStructuralUnitScope } from '@/entities/user/lib/structural-unit-scope'
import { getUserFullName } from '@/entities/user/lib/user-display'
import type { User } from '@/entities/user/model/types'
import { useUsersStore } from '@/entities/user/model/users-store'
import { UsersPageSkeleton } from '@/features/users/ui/UsersPageSkeleton'
import { useRoleName } from '@/entities/role/lib/use-role-name'
import { useStructuralUnitName } from '@/entities/structural-unit/lib/use-structural-unit-name'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

function UserMeta({ user }: { user: User }) {
  const roleName = useRoleName(user.roleId)
  const structuralUnitName = useStructuralUnitName(user.structuralUnitId)

  return (
    <div>
      <Typography.Text strong>{getUserFullName(user)}</Typography.Text>
      <div>
        <Typography.Text type="secondary">
          {roleName} • {structuralUnitName}
        </Typography.Text>
      </div>
    </div>
  )
}

function formatLastSeen(user: User, t: (key: string) => string) {
  if (user.isOnline) {
    return t('employeesPage.nowOnline')
  }

  if (!user.lastSeenAt) {
    return t('employeesPage.neverOnline')
  }

  return dayjs(user.lastSeenAt).format('DD.MM.YYYY HH:mm')
}

export function EmployeesPage() {
  const { t } = useTranslation()
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const users = useUsersStore((state) => state.users)
  const isUsersHydrated = useUsersStore((state) => state.isHydrated)
  const [searchValue, setSearchValue] = useState('')

  const scopedUsers = useMemo(
    () => filterUsersByStructuralUnitScope(users, currentUser, canViewAll),
    [users, currentUser, canViewAll],
  )

  const filteredUsers = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    if (!query) {
      return scopedUsers
    }

    return scopedUsers.filter((user) =>
      [
        getUserFullName(user),
        user.position,
        user.phone,
        user.tabelNumber,
      ].some((value) => value.toLowerCase().includes(query)),
    )
  }, [scopedUsers, searchValue])

  const onlineCount = useMemo(
    () => filteredUsers.filter((user) => user.isOnline).length,
    [filteredUsers],
  )

  const activeCount = useMemo(
    () => filteredUsers.filter((user) => user.isActive !== false).length,
    [filteredUsers],
  )

  const columns: ColumnsType<User> = [
    {
      title: t('employeesPage.columns.employee'),
      dataIndex: 'firstName',
      key: 'employee',
      render: (_, user) => <UserMeta user={user} />,
      sorter: (left, right) => getUserFullName(left).localeCompare(getUserFullName(right)),
    },
    {
      title: t('employeesPage.columns.position'),
      dataIndex: 'position',
      key: 'position',
      sorter: (left, right) => left.position.localeCompare(right.position),
    },
    {
      title: t('employeesPage.columns.accountStatus'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (_, user) =>
        user.isActive === false ? (
          <Tag color="default">{t('users.status.inactive')}</Tag>
        ) : (
          <Tag color="blue">{t('users.status.active')}</Tag>
        ),
    },
    {
      title: t('employeesPage.columns.onlineStatus'),
      dataIndex: 'isOnline',
      key: 'isOnline',
      render: (_, user) => (
        <Badge
          status={user.isOnline ? 'success' : 'default'}
          text={user.isOnline ? t('employeesPage.online') : t('employeesPage.offline')}
        />
      ),
      sorter: (left, right) => Number(Boolean(right.isOnline)) - Number(Boolean(left.isOnline)),
    },
    {
      title: t('employeesPage.columns.lastSeen'),
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      render: (_, user) => formatLastSeen(user, t),
      sorter: (left, right) => {
        const leftTime = left.lastSeenAt ? dayjs(left.lastSeenAt).valueOf() : 0
        const rightTime = right.lastSeenAt ? dayjs(right.lastSeenAt).valueOf() : 0
        return rightTime - leftTime
      },
    },
    {
      title: t('employeesPage.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
    },
  ]

  if (!isUsersHydrated) {
    return <UsersPageSkeleton />
  }

  return (
    <div style={fullHeightPageStyle}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title={t('employeesPage.stats.total')} value={filteredUsers.length} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title={t('employeesPage.stats.online')} value={onlineCount} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title={t('employeesPage.stats.active')} value={activeCount} />
            </Card>
          </Col>
        </Row>

        <Card
          title={t('menu.management.employees')}
          extra={
            <Input.Search
              allowClear
              placeholder={t('employeesPage.searchPlaceholder')}
              style={{ width: 320 }}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onSearch={setSearchValue}
            />
          }
        >
          <Table<User>
            rowKey="id"
            columns={columns}
            dataSource={filteredUsers}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{
              emptyText: <Empty description={t('employeesPage.empty')} />,
            }}
          />
        </Card>
      </Space>
    </div>
  )
}
