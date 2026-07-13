import { useMemo } from 'react'
import { canViewAllStructuralUnits } from '@/entities/user/lib/structural-unit-scope'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'

export function useStructuralUnitScope() {
  const currentUser = useAuthStore((state) => state.currentUser)
  const users = useUsersStore((state) => state.users)
  const roles = useRolesStore((state) => state.roles)

  const role = useMemo(
    () => roles.find((item) => item.id === currentUser?.roleId),
    [currentUser?.roleId, roles],
  )

  const canViewAll = canViewAllStructuralUnits(role)

  return useMemo(
    () => ({
      currentUser,
      users,
      role,
      canViewAll,
    }),
    [canViewAll, currentUser, role, users],
  )
}
