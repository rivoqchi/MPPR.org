import { PlusOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Empty, Input, Pagination, theme } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveMediaUrl } from '@/shared/lib/resolve-media-url'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import type { User } from '@/entities/user/model/types'
import { filterUsers } from '@/features/users/lib/filter-users'
import { TABLE_PAGE_SIZE } from '@/shared/lib/constants'
import { splitPanelScrollStyle, getSplitPanelListShellStyle } from '@/shared/lib/page-layout'

interface UserListProps {
  users: User[]
  selectedUserId?: string
  onSelect: (userId: string) => void
  onAdd?: () => void
}

export function UserList({ users, selectedUserId, onSelect, onAdd }: UserListProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)

  const filteredUsers = useMemo(
    () => filterUsers(users, searchValue),
    [users, searchValue],
  )

  useEffect(() => {
    setPage(1)
  }, [searchValue])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredUsers.length / TABLE_PAGE_SIZE))

    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filteredUsers.length, page])

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE

    return filteredUsers.slice(start, start + TABLE_PAGE_SIZE)
  }, [filteredUsers, page])

  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        flexShrink: 0,
        ...getSplitPanelListShellStyle(token),
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 600 }}>{t('users.listTitle')}</span>
        {onAdd && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {t('users.add')}
          </Button>
        )}
      </div>

      <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Input.Search
          allowClear
          placeholder={t('users.searchPlaceholder')}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onSearch={setSearchValue}
        />
      </div>

      <div
        style={{
          ...splitPanelScrollStyle,
          overscrollBehavior: 'contain',
          padding: '8px 12px',
        }}
      >
        {users.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('users.emptyList')}
            style={{ marginTop: 48 }}
          />
        ) : filteredUsers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('users.emptySearch')}
            style={{ marginTop: 48 }}
          />
        ) : (
          paginatedUsers.map((user) => {
            const isSelected = user.id === selectedUserId

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user.id)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: token.borderRadiusLG,
                  background: isSelected ? token.colorPrimaryBg : 'transparent',
                  boxShadow: isSelected ? `inset 3px 0 0 ${token.colorPrimary}` : undefined,
                  padding: '12px 14px',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease, opacity 0.2s ease',
                  opacity: user.isActive === false ? 0.55 : 1,
                }}
              >
                <Avatar src={resolveMediaUrl(user.avatar)} size="large" icon={<UserOutlined />}>
                  {!user.avatar ? getUserInitials(user) : null}
                </Avatar>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: token.colorText,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getUserFullName(user)}
                  </div>
                  <div
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.position}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {filteredUsers.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Pagination
            current={page}
            pageSize={TABLE_PAGE_SIZE}
            total={filteredUsers.length}
            showSizeChanger={false}
            onChange={setPage}
            size="small"
          />
        </div>
      )}
    </div>
  )
}
