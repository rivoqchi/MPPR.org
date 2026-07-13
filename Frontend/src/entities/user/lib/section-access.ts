import type { User } from '@/entities/user/model/types'

export const SECTIONLESS_ACCESS_VALUE = '__sectionless__'

export interface ParsedSectionAssignment {
  withoutSectionAccess: boolean
  structuralUnitSectionId?: string
}

export function parseSectionSelection(
  selection: string | undefined,
): ParsedSectionAssignment {
  if (!selection || selection === SECTIONLESS_ACCESS_VALUE) {
    return {
      withoutSectionAccess: true,
      structuralUnitSectionId: undefined,
    }
  }

  return {
    withoutSectionAccess: false,
    structuralUnitSectionId: selection,
  }
}

export function getSectionSelectionValue(user: User): string | undefined {
  if (user.withoutSectionAccess) {
    return SECTIONLESS_ACCESS_VALUE
  }

  return user.structuralUnitSectionId
}

export function userHasSectionlessAccess(user: User | null | undefined): boolean {
  if (!user) {
    return false
  }

  return Boolean(user.withoutSectionAccess)
}

export function filterSectionsForUserAccess<T extends { id: string }>(
  sections: T[],
  user: User | null | undefined,
  structuralUnitId: string,
  canViewAll = false,
): T[] {
  if (canViewAll) {
    return sections
  }

  if (!user || user.structuralUnitId !== structuralUnitId) {
    return sections
  }

  if (user.withoutSectionAccess) {
    return sections
  }

  if (user.structuralUnitSectionId) {
    return sections.filter((section) => section.id === user.structuralUnitSectionId)
  }

  return sections
}
