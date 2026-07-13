import { canViewAllStructuralUnits } from '@/entities/user/lib/structural-unit-scope'
import type { Role } from '@/entities/role/model/types'

/** @deprecated Use canViewAllStructuralUnits instead */
export function canViewAllPprTypes(role: Role | undefined): boolean {
  return canViewAllStructuralUnits(role)
}
