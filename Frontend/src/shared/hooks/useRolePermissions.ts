import { useMemo } from 'react'
import {
  canCreateOnPage,
  canDeleteOnPage,
  canEditOnPage,
  canViewPage,
} from '@/entities/role/lib/permissions'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { useAuthStore } from '@/entities/user/model/auth-store'

export function useRolePermissions() {
  const currentUser = useAuthStore((state) => state.currentUser)
  const roles = useRolesStore((state) => state.roles)

  const role = useMemo(
    () => roles.find((item) => item.id === currentUser?.roleId),
    [currentUser?.roleId, roles],
  )

  return useMemo(
    () => ({
      role,
      canView: (pageKey: string) => canViewPage(role, pageKey),
      canCreate: (pageKey: string) => canCreateOnPage(role, pageKey),
      canEdit: (pageKey: string) => canEditOnPage(role, pageKey),
      canDelete: (pageKey: string) => canDeleteOnPage(role, pageKey),
    }),
    [role],
  )
}
