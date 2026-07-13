import type { Dayjs } from 'dayjs'

export type DashboardScopeValue = 'all' | 'structure' | 'section' | `section:${string}`

export type DashboardApplicationScope = 'all' | 'submitted' | 'incoming'

export type DashboardFilters = {
  structuralUnitId?: string
  scopeValue: DashboardScopeValue
  periodRange: [Dayjs | null, Dayjs | null] | null
  applicationScope: DashboardApplicationScope
}

export type DashboardSummaryQuery = {
  structuralUnitId?: string
  scopeType?: 'structure' | 'section'
  sectionId?: string
  fromYear?: number
  fromMonth?: number
  toYear?: number
  toMonth?: number
  applicationScope?: DashboardApplicationScope
}

export function buildDashboardSummaryQuery(
  filters: DashboardFilters,
): DashboardSummaryQuery {
  const params: DashboardSummaryQuery = {
    applicationScope: filters.applicationScope,
  }

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

export function hasActiveDashboardFilters(filters: DashboardFilters): boolean {
  return (
    Boolean(filters.structuralUnitId) ||
    filters.scopeValue !== 'all' ||
    filters.applicationScope !== 'all' ||
    Boolean(filters.periodRange?.[0] || filters.periodRange?.[1])
  )
}

export function createDefaultDashboardFilters(options?: {
  structuralUnitId?: string
  periodRange?: [Dayjs | null, Dayjs | null] | null
}): DashboardFilters {
  return {
    structuralUnitId: options?.structuralUnitId,
    scopeValue: 'all',
    periodRange: options?.periodRange ?? null,
    applicationScope: 'all',
  }
}
