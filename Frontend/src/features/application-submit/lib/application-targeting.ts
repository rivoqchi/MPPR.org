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

export function isSingleApplicationHeadRecipient(
  application: Pick<
    Application,
    'submissionMode' | 'structuralUnitIds' | 'structuralUnitSectionId'
  >,
  userId: string | undefined,
  structuralUnits: StructuralUnit[],
  users: User[] = [],
): boolean {
  if (!userId || normalizeApplicationSubmissionMode(application.submissionMode) !== 'single') {
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
    'submissionMode' | 'structuralUnitIds' | 'structuralUnitSectionId'
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
