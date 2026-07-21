import { App } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@/entities/user/model/types'
import { filterUsersByStructuralUnitScope } from '@/entities/user/lib/structural-unit-scope'
import { useUsersStore } from '@/entities/user/model/users-store'
import { UserDetail } from '@/features/users/ui/UserDetail'
import { UserDrawer } from '@/features/users/ui/UserDrawer'
import { UserList } from '@/features/users/ui/UserList'
import { UsersPageSkeleton } from '@/features/users/ui/UsersPageSkeleton'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle, splitPageRowStyle } from '@/shared/lib/page-layout'

export function UsersPage() {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const { canCreate, canEdit } = useRolePermissions()
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const pageKey = '/management/users'
  const isUsersHydrated = useUsersStore((state) => state.isHydrated)
  const users = useUsersStore((state) => state.users)
  const setUserActive = useUsersStore((state) => state.setUserActive)
  const removeUser = useUsersStore((state) => state.removeUser)
  const scopedUsers = useMemo(
    () => filterUsersByStructuralUnitScope(users, currentUser, canViewAll),
    [users, currentUser, canViewAll],
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>()
  const [isActiveToggleLoading, setIsActiveToggleLoading] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const activeUserId = selectedUserId ?? scopedUsers[0]?.id

  const selectedUser = useMemo(
    () => scopedUsers.find((user) => user.id === activeUserId),
    [activeUserId, scopedUsers],
  )

  const handleOpenCreate = () => {
    setEditingUser(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = () => {
    if (!selectedUser) {
      return
    }

    setEditingUser(selectedUser)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingUser(null)
  }

  const handleSaved = (userId: string) => {
    setDrawerOpen(false)
    setEditingUser(null)
    setSelectedUserId(userId)
    notification.success({
      message: t('users.notifications.savedTitle'),
      description: t('users.notifications.savedDescription'),
    })
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (!selectedUser) {
      return
    }

    if (!isActive && selectedUser.id === currentUser?.id) {
      notification.warning({ message: t('users.messages.cannotDeactivateSelf') })
      return
    }

    setIsActiveToggleLoading(true)

    try {
      await setUserActive(selectedUser.id, isActive)
      notification.success({
        message: isActive
          ? t('users.messages.activated')
          : t('users.messages.deactivated'),
      })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'users.messages.error' })
    } finally {
      setIsActiveToggleLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) {
      return
    }

    if (selectedUser.id === currentUser?.id) {
      notification.warning({ message: t('users.messages.cannotDeleteSelf') })
      return
    }

    setIsDeleteLoading(true)

    try {
      await removeUser(selectedUser.id)
      setSelectedUserId(undefined)
      notification.success({ message: t('users.messages.deleteSuccess') })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'users.messages.deleteError' })
    } finally {
      setIsDeleteLoading(false)
    }
  }

  if (!isUsersHydrated) {
    return <UsersPageSkeleton />
  }

  return (
    <>
      <div style={fullHeightPageStyle}>
        <div style={splitPageRowStyle}>
          <UserList
            users={scopedUsers}
            selectedUserId={activeUserId}
            onSelect={setSelectedUserId}
            onAdd={canCreate(pageKey) ? handleOpenCreate : undefined}
          />

          <UserDetail
            user={selectedUser}
            onEdit={canEdit(pageKey) && selectedUser ? handleOpenEdit : undefined}
            onToggleActive={canEdit(pageKey) && selectedUser ? handleToggleActive : undefined}
            onDelete={canEdit(pageKey) && selectedUser ? handleDelete : undefined}
            isActiveToggleLoading={isActiveToggleLoading}
            isDeleteLoading={isDeleteLoading}
            canToggleActive={selectedUser?.id !== currentUser?.id}
            canDelete={selectedUser?.id !== currentUser?.id}
          />
        </div>
      </div>

      {(canCreate(pageKey) || canEdit(pageKey)) && (
        <UserDrawer
          key={editingUser?.id ?? 'create'}
          open={drawerOpen}
          editingUser={editingUser}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
