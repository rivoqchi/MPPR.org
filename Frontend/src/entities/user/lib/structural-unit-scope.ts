import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'
import type { Role } from '@/entities/role/model/types'
import type { User } from '@/entities/user/model/types'

export const LEGACY_MONITORING_ROLE_ID = 'legacy-boshliq-monitoring'

export function canViewAllStructuralUnits(role: Role | undefined): boolean {
  if (!role) {
    return false
  }

  if (role.id === SYSTEM_ADMIN_ROLE_ID || role.isSystem) {
    return true
  }

  if (role.id === LEGACY_MONITORING_ROLE_ID) {
    return true
  }

  return Boolean(role.canViewAllStructuralUnits)
}

export function getUserStructuralUnitId(
  userId: string | undefined,
  users: User[],
): string | undefined {
  if (!userId) {
    return undefined
  }

  return users.find((user) => user.id === userId)?.structuralUnitId
}

export function filterByStructuralUnitScope<T>(
  items: T[],
  getOwnerUserId: (item: T) => string | undefined,
  currentUser: User | null,
  users: User[],
  canViewAll: boolean,
): T[] {
  if (!currentUser) {
    return []
  }

  if (canViewAll) {
    return items
  }

  if (!currentUser.structuralUnitId) {
    return []
  }

  return items.filter((item) => {
    const ownerUnitId = getUserStructuralUnitId(getOwnerUserId(item), users)

    return ownerUnitId === currentUser.structuralUnitId
  })
}

export function filterUsersByStructuralUnitScope(
  users: User[],
  currentUser: User | null,
  canViewAll: boolean,
): User[] {
  if (!currentUser) {
    return []
  }

  if (canViewAll) {
    return users
  }

  if (!currentUser.structuralUnitId) {
    return []
  }

  return users.filter((user) => user.structuralUnitId === currentUser.structuralUnitId)
}
