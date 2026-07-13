import type { StructuralUnitDocument } from '@/entities/structural-unit/model/types'

export type RoleDocument = StructuralUnitDocument

export interface PagePermission {
  pageKey: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  documents: RoleDocument[]
  permissions: PagePermission[]
  canViewAllStructuralUnits?: boolean
  isSystem?: boolean
  createdAt: string
  updatedAt: string
}

export interface RoleFormValues {
  name: string
  description: string
  documents: RoleDocument[]
  permissions: PagePermission[]
  canViewAllStructuralUnits: boolean
}
