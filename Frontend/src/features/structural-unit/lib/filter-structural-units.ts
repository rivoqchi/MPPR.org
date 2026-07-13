import type { StructuralUnit } from '@/entities/structural-unit/model/types'

export interface StructuralUnitFilters {
  search?: string
  shortName?: string
  originalName?: string
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase()
}

export function applyStructuralUnitFilters(
  structuralUnits: StructuralUnit[],
  filters: StructuralUnitFilters,
): StructuralUnit[] {
  const normalizedSearch = filters.search ? normalizeSearchValue(filters.search) : undefined

  return structuralUnits.filter((item) => {
    if (filters.shortName && item.shortName !== filters.shortName) {
      return false
    }

    if (filters.originalName && item.originalName !== filters.originalName) {
      return false
    }

    if (normalizedSearch) {
      const haystack = [item.originalName, item.shortName, item.headFullName]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(normalizedSearch)) {
        return false
      }
    }

    return true
  })
}

export function getStructuralUnitFilterOptions(structuralUnits: StructuralUnit[]) {
  const shortNames = [...new Set(structuralUnits.map((item) => item.shortName))]
    .sort((a, b) => a.localeCompare(b, 'uz'))
    .map((name) => ({
      value: name,
      label: name,
    }))

  const originalNames = [...new Set(structuralUnits.map((item) => item.originalName))]
    .sort((a, b) => a.localeCompare(b, 'uz'))
    .map((name) => ({
      value: name,
      label: name,
    }))

  return {
    shortNames,
    originalNames,
  }
}
