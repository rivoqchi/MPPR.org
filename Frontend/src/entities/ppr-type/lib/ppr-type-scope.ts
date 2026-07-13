import type { PprType, PprTypeScopeType } from '@/entities/ppr-type/model/types'
import type { PprCalendarViewScope } from '@/entities/ppr-calendar/model/types'
import { userHasSectionlessAccess } from '@/entities/user/lib/section-access'
import type { User } from '@/entities/user/model/types'

export interface ResolvedPprTypeScope {
  structuralUnitId: string
  scopeType: PprTypeScopeType
  sectionId: string
}

export function resolvePprTypeScope(pprType: PprType, users: User[]): ResolvedPprTypeScope {
  if (pprType.structuralUnitId && pprType.scopeType) {
    return {
      structuralUnitId: pprType.structuralUnitId,
      scopeType: pprType.scopeType,
      sectionId: pprType.sectionId ?? '',
    }
  }

  const owner = users.find((user) => user.id === pprType.createdByUserId)

  if (!owner) {
    return {
      structuralUnitId: '',
      scopeType: 'structure',
      sectionId: '',
    }
  }

  if (userHasSectionlessAccess(owner)) {
    return {
      structuralUnitId: owner.structuralUnitId,
      scopeType: 'structure',
      sectionId: '',
    }
  }

  return {
    structuralUnitId: owner.structuralUnitId,
    scopeType: 'section',
    sectionId: owner.structuralUnitSectionId ?? '',
  }
}

export function isPprTypeVisibleToUser(
  pprType: PprType,
  currentUser: User | null,
  users: User[],
  canViewAll: boolean,
): boolean {
  if (!currentUser) {
    return false
  }

  if (canViewAll) {
    return true
  }

  const scope = resolvePprTypeScope(pprType, users)

  if (!scope.structuralUnitId || scope.structuralUnitId !== currentUser.structuralUnitId) {
    return false
  }

  if (scope.scopeType === 'structure') {
    return userHasSectionlessAccess(currentUser)
  }

  if (userHasSectionlessAccess(currentUser)) {
    return false
  }

  return (
    Boolean(currentUser.structuralUnitSectionId) &&
    currentUser.structuralUnitSectionId === scope.sectionId
  )
}

export function filterPprTypesForUser(
  pprTypes: PprType[],
  currentUser: User | null,
  users: User[],
  canViewAll: boolean,
): PprType[] {
  return pprTypes.filter((pprType) =>
    isPprTypeVisibleToUser(pprType, currentUser, users, canViewAll),
  )
}

export function filterPprTypesForViewScope(
  pprTypes: PprType[],
  viewScope: PprCalendarViewScope | null | undefined,
  structuralUnitId: string,
  users: User[],
): PprType[] {
  const resolved = viewScope ?? { type: 'structure' as const }

  return pprTypes.filter((pprType) => {
    const scope = resolvePprTypeScope(pprType, users)

    if (scope.structuralUnitId !== structuralUnitId) {
      return false
    }

    if (resolved.type === 'structure') {
      return scope.scopeType === 'structure'
    }

    return scope.scopeType === 'section' && scope.sectionId === resolved.sectionId
  })
}

export function matchesUserPprScope(
  pprType: PprType,
  currentUser: User | null,
  users: User[],
): boolean {
  if (!currentUser) {
    return false
  }

  const scope = resolvePprTypeScope(pprType, users)

  if (scope.structuralUnitId !== currentUser.structuralUnitId) {
    return false
  }

  if (userHasSectionlessAccess(currentUser)) {
    return scope.scopeType === 'structure'
  }

  return scope.scopeType === 'section' && scope.sectionId === (currentUser.structuralUnitSectionId ?? '')
}
