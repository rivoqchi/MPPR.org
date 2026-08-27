import type { Application, ApplicationSubmissionMode } from '@/entities/application/model/types'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import {
  resolveSectionHeadUserId,
  resolveStructuralUnitHeadUserId,
} from '@/features/structural-unit/lib/head-user-select'
import type { User } from '@/entities/user/model/types'

export function normalizeApplicationSubmissionMode(
  value: unknown,
): ApplicationSubmissionMode {
  return value === 'single' ? 'single' : 'combined'
}

export function normalizeApplicationRecipientUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

export function isSingleApplicationHeadRecipient(
  application: Pick<
    Application,
    'submissionMode' | 'structuralUnitIds' | 'structuralUnitSectionId' | 'recipientUserIds'
  >,
  userId: string | undefined,
  structuralUnits: StructuralUnit[],
  users: User[] = [],
): boolean {
  if (!userId) {
    return false
  }

  const explicitRecipients = normalizeApplicationRecipientUserIds(application.recipientUserIds)

  if (explicitRecipients.length > 0) {
    return explicitRecipients.includes(userId)
  }

  if (normalizeApplicationSubmissionMode(application.submissionMode) !== 'single') {
    return false
  }

  const unitId = application.structuralUnitIds[0]
  const unit = structuralUnits.find((item) => item.id === unitId)

  if (!unit) {
    return false
  }

  const unitHeadId = resolveStructuralUnitHeadUserId(unit, users)

  if (unitHeadId === userId) {
    return true
  }

  const sectionId = application.structuralUnitSectionId

  if (!sectionId) {
    return false
  }

  const section = unit.sections.find((item) => item.id === sectionId)

  if (!section) {
    return false
  }

  return resolveSectionHeadUserId(section, users) === userId
}

export function canReceiveIncomingApplication(
  application: Pick<
    Application,
    | 'submissionMode'
    | 'structuralUnitIds'
    | 'structuralUnitSectionId'
    | 'recipientUserIds'
    | 'workflowAssignments'
  >,
  options: {
    userId?: string
    structuralUnitId?: string
    canViewAll?: boolean
    structuralUnits: StructuralUnit[]
    users?: User[]
  },
): boolean {
  if (options.canViewAll) {
    return true
  }

  const assignments = Array.isArray(application.workflowAssignments)
    ? application.workflowAssignments
    : []

  if (assignments.length > 0) {
    return Boolean(options.userId && assignments.some((item) => item.userId === options.userId))
  }

  const explicitRecipients = normalizeApplicationRecipientUserIds(application.recipientUserIds)

  if (explicitRecipients.length > 0) {
    return Boolean(options.userId && explicitRecipients.includes(options.userId))
  }

  if (!options.structuralUnitId) {
    return false
  }

  if (!application.structuralUnitIds.includes(options.structuralUnitId)) {
    return false
  }

  if (normalizeApplicationSubmissionMode(application.submissionMode) !== 'single') {
    return true
  }

  return isSingleApplicationHeadRecipient(
    application,
    options.userId,
    options.structuralUnits,
    options.users ?? [],
  )
}
