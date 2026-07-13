import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'
import type { PagePermission, Role } from '@/entities/role/model/types'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

function getPagePermission(role: Role | undefined, pageKey: string): PagePermission | undefined {
  return role?.permissions.find((permission) => permission.pageKey === pageKey)
}

export function hasPermission(
  role: Role | undefined,
  pageKey: string,
  action: PermissionAction,
): boolean {
  if (!role) {
    return false
  }

  if (role.id === SYSTEM_ADMIN_ROLE_ID || role.isSystem) {
    return true
  }

  const permission = getPagePermission(role, pageKey)

  if (!permission) {
    return false
  }

  switch (action) {
    case 'view':
      return permission.canView
    case 'create':
      return permission.canCreate
    case 'edit':
      return permission.canEdit
    case 'delete':
      return permission.canDelete
    default:
      return false
  }
}

export function canViewPage(role: Role | undefined, pageKey: string): boolean {
  return hasPermission(role, pageKey, 'view')
}

export function canCreateOnPage(role: Role | undefined, pageKey: string): boolean {
  return hasPermission(role, pageKey, 'create')
}

export function canEditOnPage(role: Role | undefined, pageKey: string): boolean {
  return hasPermission(role, pageKey, 'edit')
}

export function canDeleteOnPage(role: Role | undefined, pageKey: string): boolean {
  return hasPermission(role, pageKey, 'delete')
}
