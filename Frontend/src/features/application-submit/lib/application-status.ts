import type { Application, ApplicationStatus } from '@/entities/application/model/types'
import {
  ensureApplicationWorkflowUnitStatuses,
  isWorkflowFinalized,
} from '@/features/application-workflow/lib/workflow-unit-status'

export function getApplicationStatusTagColor(status: ApplicationStatus): string {
  switch (status) {
    case 'in_progress':
      return 'processing'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

export function hasApplicationWorkflow(
  application: Pick<Application, 'structuralUnitIds' | 'workflowUnitStatuses' | 'workflowStatus'>,
): boolean {
  return ensureApplicationWorkflowUnitStatuses(application).length > 0
}

export function isApplicationFinalized(
  application: Pick<Application, 'status' | 'workflowStatus'>,
): boolean {
  return (
    application.status === 'completed' ||
    application.status === 'cancelled' ||
    isWorkflowFinalized(application.workflowStatus)
  )
}
