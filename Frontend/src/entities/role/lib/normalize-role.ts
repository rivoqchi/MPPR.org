import { mergeRolePermissions } from '@/entities/role/lib/default-roles'
import { normalizeStructuralUnitDocuments } from '@/features/structural-unit/lib/document-utils'
import type { PagePermission, Role } from '@/entities/role/model/types'

function isPagePermission(value: unknown): value is PagePermission {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return typeof (value as PagePermission).pageKey === 'string'
}

export function normalizeRolePermissions(value: unknown): PagePermission[] {
  if (!Array.isArray(value)) {
    return mergeRolePermissions([])
  }

  return mergeRolePermissions(value.filter(isPagePermission))
}

export function normalizeRole(role: Role): Role {
  return {
    ...role,
    documents: normalizeStructuralUnitDocuments(role.documents),
    permissions: normalizeRolePermissions(role.permissions),
  }
}
