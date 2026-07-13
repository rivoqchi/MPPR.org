import type { RegisteredObject } from '@/entities/object/model/types'

export interface ObjectFilters {
  search?: string
  shortName?: string
  originalName?: string
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase()
}

export function applyObjectFilters(
  objects: RegisteredObject[],
  filters: ObjectFilters,
): RegisteredObject[] {
  const normalizedSearch = filters.search ? normalizeSearchValue(filters.search) : undefined

  return objects.filter((item) => {
    if (filters.shortName && item.shortName !== filters.shortName) {
      return false
    }

    if (filters.originalName && item.originalName !== filters.originalName) {
      return false
    }

    if (normalizedSearch) {
      const haystack = [item.originalName, item.shortName, item.location.address]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(normalizedSearch)) {
        return false
      }
    }

    return true
  })
}

export function getObjectFilterOptions(objects: RegisteredObject[]) {
  const shortNames = [...new Set(objects.map((item) => item.shortName))]
    .sort((a, b) => a.localeCompare(b, 'uz'))
    .map((name) => ({
      value: name,
      label: name,
    }))

  const originalNames = [...new Set(objects.map((item) => item.originalName))]
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
