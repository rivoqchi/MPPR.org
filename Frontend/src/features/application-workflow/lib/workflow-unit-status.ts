import type {
  Application,
  ApplicationWorkflowStatus,
  ApplicationWorkflowUnitStatus,
} from '@/entities/application/model/types'

const WORKFLOW_UNIT_STATUSES: ApplicationWorkflowStatus[] = [
  'returned',
  'in_progress_work',
  'pending_confirmation',
]

export function syncWorkflowUnitStatuses(
  structuralUnitIds: string[],
  existing: ApplicationWorkflowUnitStatus[],
  fallbackStatus: ApplicationWorkflowStatus = 'in_progress_work',
): ApplicationWorkflowUnitStatus[] {
  return structuralUnitIds.map((structuralUnitId) => {
    const current = existing.find((item) => item.structuralUnitId === structuralUnitId)

    if (current) {
      return current
    }

    return {
      structuralUnitId,
      workflowStatus: fallbackStatus,
      confirmationFiles: [],
    }
  })
}

export function aggregateWorkflowStatus(
  statuses: ApplicationWorkflowUnitStatus[],
): ApplicationWorkflowStatus {
  if (statuses.length === 0) {
    return 'in_progress_work'
  }

  const values = statuses.map((item) => item.workflowStatus)

  if (values.every((value) => value === 'pending_confirmation')) {
    return 'pending_confirmation'
  }

  if (values.every((value) => value === 'in_progress_work')) {
    return 'in_progress_work'
  }

  if (values.every((value) => value === 'returned')) {
    return 'returned'
  }

  return 'in_progress_work'
}

export function ensureApplicationWorkflowUnitStatuses(
  application: Pick<Application, 'structuralUnitIds' | 'workflowUnitStatuses' | 'workflowStatus'>,
): ApplicationWorkflowUnitStatus[] {
  const existing = Array.isArray(application.workflowUnitStatuses)
    ? application.workflowUnitStatuses
    : []

  if (existing.length > 0) {
    return syncWorkflowUnitStatuses(application.structuralUnitIds, existing, application.workflowStatus)
  }

  return syncWorkflowUnitStatuses(
    application.structuralUnitIds,
    [],
    application.workflowStatus ?? 'in_progress_work',
  )
}

export function getWorkflowUnitStatus(
  application: Pick<Application, 'structuralUnitIds' | 'workflowUnitStatuses' | 'workflowStatus'>,
  structuralUnitId?: string,
): ApplicationWorkflowUnitStatus | undefined {
  if (!structuralUnitId) {
    return undefined
  }

  return ensureApplicationWorkflowUnitStatuses(application).find(
    (item) => item.structuralUnitId === structuralUnitId,
  )
}

export function canUpdateWorkflowUnitStatus(
  application: Pick<Application, 'structuralUnitIds' | 'workflowStatus'>,
  structuralUnitId?: string,
): boolean {
  if (isWorkflowFinalized(application.workflowStatus)) {
    return false
  }

  return Boolean(structuralUnitId && application.structuralUnitIds.includes(structuralUnitId))
}

export function isWorkflowStatus(value: unknown): value is ApplicationWorkflowStatus {
  return typeof value === 'string' && WORKFLOW_UNIT_STATUSES.includes(value as ApplicationWorkflowStatus)
}

export function isWorkflowFinalized(workflowStatus: ApplicationWorkflowStatus): boolean {
  return workflowStatus === 'confirmed' || workflowStatus === 'cancelled'
}

export function allUnitsPendingConfirmation(
  application: Pick<Application, 'structuralUnitIds' | 'workflowUnitStatuses' | 'workflowStatus'>,
): boolean {
  const units = ensureApplicationWorkflowUnitStatuses(application)
  return units.length > 0 && units.every((item) => item.workflowStatus === 'pending_confirmation')
}

export function isApplicationSubmitter(
  application: Pick<Application, 'createdByStructuralUnitId'>,
  structuralUnitId?: string,
): boolean {
  return Boolean(structuralUnitId && application.createdByStructuralUnitId === structuralUnitId)
}

export function canSubmitterFinalizeApplication(
  application: Pick<
    Application,
    'createdByStructuralUnitId' | 'structuralUnitIds' | 'workflowUnitStatuses' | 'workflowStatus'
  >,
  structuralUnitId?: string,
): boolean {
  return (
    isApplicationSubmitter(application, structuralUnitId) &&
    application.workflowStatus === 'pending_confirmation' &&
    allUnitsPendingConfirmation(application) &&
    !isWorkflowFinalized(application.workflowStatus)
  )
}
