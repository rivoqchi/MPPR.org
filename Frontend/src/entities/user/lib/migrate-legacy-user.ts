import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'
import type { LegacyUser, User } from '@/entities/user/model/types'

const LEGACY_ROLE_MAP: Record<string, string> = {
  admin: SYSTEM_ADMIN_ROLE_ID,
  xodim: 'legacy-xodim',
  boshliq_monitoring: 'legacy-boshliq-monitoring',
}

export function migrateLegacyUser(user: LegacyUser): User {
  const withRole = (() => {
    if (user.roleId) {
      return user as User
    }

    if (user.role) {
      return {
        ...user,
        roleId: LEGACY_ROLE_MAP[user.role] ?? user.role,
      }
    }

    return {
      ...user,
      roleId: SYSTEM_ADMIN_ROLE_ID,
    }
  })()

  return {
    ...withRole,
    structuralUnitId: withRole.structuralUnitId ?? '',
    tabelNumber: withRole.tabelNumber ?? '00000',
    withoutSectionAccess: withRole.withoutSectionAccess ?? true,
    structuralUnitSectionId: withRole.structuralUnitSectionId,
  }
}
