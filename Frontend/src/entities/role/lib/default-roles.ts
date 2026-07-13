import type { PagePermission, Role } from '@/entities/role/model/types'
import { PERMISSION_PAGES } from '@/shared/config/permission-pages'

export const SYSTEM_ADMIN_ROLE_ID = 'system-admin-role'

export function createFullPagePermissions(): PagePermission[] {
  return PERMISSION_PAGES.map((page) => ({
    pageKey: page.key,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  }))
}

export function createEmptyPagePermissions(): PagePermission[] {
  return PERMISSION_PAGES.map((page) => ({
    pageKey: page.key,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  }))
}

export function createSystemAdminRole(): Role {
  const now = '2024-01-01T00:00:00.000Z'

  return {
    id: SYSTEM_ADMIN_ROLE_ID,
    name: 'Admin',
    description: 'Tizim administratori',
    documents: [],
    permissions: createFullPagePermissions(),
    canViewAllStructuralUnits: true,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function mergeRolePermissions(savedPermissions: PagePermission[]): PagePermission[] {
  const savedByPageKey = new Map(savedPermissions.map((permission) => [permission.pageKey, permission]))

  return PERMISSION_PAGES.map((page) => {
    const saved = savedByPageKey.get(page.key)

    return {
      pageKey: page.key,
      canView: saved?.canView ?? false,
      canCreate: saved?.canCreate ?? false,
      canEdit: saved?.canEdit ?? false,
      canDelete: saved?.canDelete ?? false,
    }
  })
}
