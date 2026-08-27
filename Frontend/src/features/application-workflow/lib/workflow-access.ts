import type { Application } from '@/entities/application/model/types'
import type { ApplicationWorkflowStatus } from '@/entities/application/model/types'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import type { User } from '@/entities/user/model/types'
import {
  isSingleApplicationHeadRecipient,
  normalizeApplicationSubmissionMode,
} from '@/features/application-submit/lib/application-targeting'

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
  options?: {
    userId?: string
    structuralUnits?: StructuralUnit[]
    users?: User[]
  },
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

  if (!application.structuralUnitIds.includes(structuralUnitId)) {
    return false
  }

  if (normalizeApplicationSubmissionMode(application.submissionMode) !== 'single') {
    return true
  }

  return isSingleApplicationHeadRecipient(
    application,
    options?.userId,
    options?.structuralUnits ?? [],
    options?.users ?? [],
  )
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
