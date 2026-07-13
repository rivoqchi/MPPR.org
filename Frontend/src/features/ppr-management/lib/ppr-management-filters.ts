import type { Dayjs } from 'dayjs'

export type PprManagementScopeValue = 'all' | 'structure' | 'section' | `section:${string}`

export type PprManagementFilters = {
  structuralUnitId?: string
  scopeValue: PprManagementScopeValue
  periodRange: [Dayjs | null, Dayjs | null] | null
}

export const defaultPprManagementFilters: PprManagementFilters = {
  structuralUnitId: undefined,
  scopeValue: 'all',
  periodRange: null,
}

export function buildApprovedMonthsQuery(filters: PprManagementFilters) {
  const params: {
    structuralUnitId?: string
    scopeType?: 'structure' | 'section'
    sectionId?: string
    fromYear?: number
    fromMonth?: number
    toYear?: number
    toMonth?: number
  } = {}

  if (filters.structuralUnitId) {
    params.structuralUnitId = filters.structuralUnitId
  }

  if (filters.scopeValue === 'structure') {
    params.scopeType = 'structure'
  } else if (filters.scopeValue === 'section') {
    params.scopeType = 'section'
  } else if (filters.scopeValue.startsWith('section:')) {
    params.scopeType = 'section'
    params.sectionId = filters.scopeValue.replace('section:', '')
  }

  const [from, to] = filters.periodRange ?? []

  if (from) {
    params.fromYear = from.year()
    params.fromMonth = from.month() + 1
  }

  if (to) {
    params.toYear = to.year()
    params.toMonth = to.month() + 1
  }

  return params
}

export function hasActivePprManagementFilters(filters: PprManagementFilters): boolean {
  return (
    Boolean(filters.structuralUnitId) ||
    filters.scopeValue !== 'all' ||
    Boolean(filters.periodRange?.[0] || filters.periodRange?.[1])
  )
}
