import type { PprShortName, PprType } from '@/entities/ppr-type/model/types'
import { filterPprTypesForUser } from '@/entities/ppr-type/lib/ppr-type-scope'
import type { User } from '@/entities/user/model/types'

export interface PprTypeFilters {
  shortName?: PprShortName
  originalName?: string
  search?: string
}

export function filterPprTypesByStructuralUnit(
  pprTypes: PprType[],
  currentUser: User | null,
  users: User[],
  canViewAll: boolean,
): PprType[] {
  return filterPprTypesForUser(pprTypes, currentUser, users, canViewAll)
}

function buildPprTypeSearchHaystack(
  item: PprType,
  getOwnerLabel?: (userId?: string) => string,
) {
  return [
    item.originalName,
    item.shortName,
    item.description,
    ...item.files.map((file) => file.name),
    getOwnerLabel?.(item.createdByUserId),
  ]
    .filter(Boolean)
    .join(' ')
}

export function applyPprTypeFilters(
  pprTypes: PprType[],
  filters: PprTypeFilters,
  options?: { getOwnerLabel?: (userId?: string) => string },
): PprType[] {
  const searchWords = filters.search
    ? filters.search
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.toLowerCase())
    : []

  return pprTypes.filter((item) => {
    if (filters.shortName && item.shortName !== filters.shortName) {
      return false
    }

    if (filters.originalName && item.originalName !== filters.originalName) {
      return false
    }

    if (searchWords.length > 0) {
      const haystack = buildPprTypeSearchHaystack(item, options?.getOwnerLabel).toLowerCase()
      const matchesSearch = searchWords.every((word) => haystack.includes(word))

      if (!matchesSearch) {
        return false
      }
    }

    return true
  })
}

export function getOriginalNameFilterOptions(pprTypes: PprType[]) {
  return [...new Set(pprTypes.map((item) => item.originalName))]
    .sort((a, b) => a.localeCompare(b, 'uz'))
    .map((name) => ({
      value: name,
      label: name,
    }))
}
