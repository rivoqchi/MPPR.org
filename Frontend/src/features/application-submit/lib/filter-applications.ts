import type { Application, ApplicationType } from '@/entities/application/model/types'

export interface ApplicationFilters {
  search?: string
  type?: ApplicationType
}

export function applyApplicationFilters(
  applications: Application[],
  filters: ApplicationFilters,
): Application[] {
  const search = filters.search?.trim().toLowerCase()

  return applications.filter((application) => {
    if (filters.type && application.type !== filters.type) {
      return false
    }

    if (!search) {
      return true
    }

    return application.comment.toLowerCase().includes(search)
  })
}

export function getApplicationTypeFilterOptions() {
  return [
    { value: 'execution' as const, labelKey: 'applicationSubmit.types.execution' },
    { value: 'information' as const, labelKey: 'applicationSubmit.types.information' },
  ]
}
