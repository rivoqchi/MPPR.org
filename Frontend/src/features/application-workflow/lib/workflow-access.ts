import type { Application } from '@/entities/application/model/types'
import type { ApplicationWorkflowStatus } from '@/entities/application/model/types'

export const WORKFLOW_STATUSES: ApplicationWorkflowStatus[] = [
  'returned',
  'in_progress_work',
  'pending_confirmation',
]

export const WORKFLOW_UNIT_STATUSES: ApplicationWorkflowStatus[] = [
  'returned',
  'in_progress_work',
  'pending_confirmation',
]

export function canAccessApplicationWorkflow(
  application: Application,
  structuralUnitId?: string,
  canViewAll = false,
): boolean {
  if (canViewAll) {
    return true
  }

  if (!structuralUnitId) {
    return false
  }

  if (application.createdByStructuralUnitId === structuralUnitId) {
    return true
  }

  return application.structuralUnitIds.includes(structuralUnitId)
}

export function getWorkflowStatusTagColor(status: ApplicationWorkflowStatus): string {
  switch (status) {
    case 'returned':
      return 'red'
    case 'in_progress_work':
      return 'processing'
    case 'pending_confirmation':
      return 'gold'
    case 'confirmed':
      return 'green'
    case 'cancelled':
      return 'red'
    default:
      return 'default'
  }
}
