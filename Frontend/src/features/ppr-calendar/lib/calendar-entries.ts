import type {
  PprCalendarEntry,
  PprCalendarEntryExecutionStatus,
  PprCalendarExecutionAttachment,
  PprCalendarMonth,
  PprCalendarMonthStatus,
  PprCalendarViewScope,
} from '@/entities/ppr-calendar/model/types'
import dayjs from 'dayjs'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import type { User } from '@/entities/user/model/types'
import type { PprCalendarEntryFormSchema } from '@/features/ppr-calendar/model/ppr-calendar-entry-form-schema'

export function groupEntriesByDate(entries: PprCalendarEntry[]): Map<string, PprCalendarEntry[]> {
  const grouped = new Map<string, PprCalendarEntry[]>()

  for (const entry of entries) {
    const existing = grouped.get(entry.date) ?? []
    grouped.set(entry.date, [...existing, entry])
  }

  return grouped
}

export function getEntriesForDate(
  entriesByDate: Map<string, PprCalendarEntry[]>,
  dateKey: string,
): PprCalendarEntry[] {
  return entriesByDate.get(dateKey) ?? []
}

export function canManagePprCalendarMonth(
  status: PprCalendarMonthStatus,
  canCreate: boolean,
  canEdit: boolean,
): boolean {
  return status === 'draft' && (canCreate || canEdit)
}

export function canSubmitPprCalendarMonth(
  status: PprCalendarMonthStatus,
  canCreate: boolean,
  entryCount: number,
): boolean {
  return status === 'draft' && canCreate && entryCount > 0
}

export function canClearPprCalendarMonth(
  status: PprCalendarMonthStatus,
  canCreate: boolean,
  entryCount: number,
  hasMonthId: boolean,
): boolean {
  return status === 'draft' && canCreate && entryCount > 0 && hasMonthId
}

const EXECUTION_WINDOW_DAYS = 3

export function canExecutePprDate(date: string, referenceDate = dayjs()): boolean {
  const entryDate = dayjs(date).startOf('day')
  const today = referenceDate.startOf('day')
  const minDate = today.subtract(EXECUTION_WINDOW_DAYS, 'day')

  return (
    entryDate.isValid() &&
    (entryDate.isSame(minDate, 'day') || entryDate.isAfter(minDate, 'day')) &&
    (entryDate.isSame(today, 'day') || entryDate.isBefore(today, 'day'))
  )
}

export function isObjectExecuted(entry: PprCalendarEntry, objectId: string): boolean {
  return (entry.executions ?? []).some((execution) => execution.objectId === objectId)
}

export function getIncompleteObjectIds(entry: PprCalendarEntry): string[] {
  return entry.objectIds.filter((objectId) => !isObjectExecuted(entry, objectId))
}

export function getEntryCompletionPercent(entry: PprCalendarEntry): number {
  if (entry.objectIds.length === 0) {
    return 0
  }

  const completedCount = entry.objectIds.filter((objectId) => isObjectExecuted(entry, objectId)).length

  return Math.round((completedCount / entry.objectIds.length) * 100)
}

export function getEntryExecutionStatus(entry: PprCalendarEntry): PprCalendarEntryExecutionStatus {
  const percent = getEntryCompletionPercent(entry)

  if (percent === 0) {
    return 'pending'
  }

  if (percent === 100) {
    return 'completed'
  }

  return 'in_progress'
}

export function getDayCompletionPercent(entries: PprCalendarEntry[]): number {
  const plannedObjects = entries.reduce((total, entry) => total + entry.objectIds.length, 0)

  if (plannedObjects === 0) {
    return 0
  }

  const completedObjects = entries.reduce((total, entry) => {
    const completed = entry.objectIds.filter((objectId) => isObjectExecuted(entry, objectId)).length
    return total + completed
  }, 0)

  return Math.round((completedObjects / plannedObjects) * 100)
}

export interface PprCalendarExecutionTimelineStep {
  id: string
  createdAt: string
  objectIds: string[]
  comment: string
  images: PprCalendarExecutionAttachment[]
  files: PprCalendarExecutionAttachment[]
  completionPercent: number
  isCompleted: boolean
}

export function buildExecutionTimelineSteps(entry: PprCalendarEntry): PprCalendarExecutionTimelineStep[] {
  const executions = [...(entry.executions ?? [])].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )

  if (executions.length === 0) {
    return []
  }

  const totalObjects = entry.objectIds.length
  const groups = new Map<string, typeof executions>()

  for (const execution of executions) {
    const existing = groups.get(execution.createdAt) ?? []
    groups.set(execution.createdAt, [...existing, execution])
  }

  const completedSoFar = new Set<string>()
  const steps: PprCalendarExecutionTimelineStep[] = []

  for (const createdAt of [...groups.keys()].sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime(),
  )) {
    const batch = groups.get(createdAt) ?? []
    const first = batch[0]

    if (!first) {
      continue
    }

    for (const execution of batch) {
      completedSoFar.add(execution.objectId)
    }

    const completionPercent =
      totalObjects === 0 ? 0 : Math.round((completedSoFar.size / totalObjects) * 100)

    steps.push({
      id: first.id,
      createdAt: first.createdAt,
      objectIds: batch.map((execution) => execution.objectId),
      comment: first.comment,
      images: first.images,
      files: first.files,
      completionPercent,
      isCompleted: completionPercent === 100,
    })
  }

  return steps
}

export function resolveHeadUserId(
  structuralUnit: Pick<StructuralUnit, 'headUserId' | 'headFullName'>,
  users: User[],
): string | undefined {
  if (structuralUnit.headUserId) {
    return structuralUnit.headUserId
  }

  const match = users.find(
    (user) =>
      `${user.firstName} ${user.lastName}`.trim().toLowerCase() ===
      structuralUnit.headFullName.trim().toLowerCase(),
  )

  return match?.id
}

export function isStructuralUnitHead(
  currentUserId: string | undefined,
  structuralUnit: Pick<StructuralUnit, 'headUserId' | 'headFullName'> | undefined,
  users: User[],
): boolean {
  if (!currentUserId || !structuralUnit) {
    return false
  }

  const headUserId = resolveHeadUserId(structuralUnit, users)

  return headUserId === currentUserId
}

export function getHeadedStructuralUnits(
  structuralUnits: StructuralUnit[],
  currentUser: User | null | undefined,
  users: User[],
): StructuralUnit[] {
  if (!currentUser?.id) {
    return []
  }

  return structuralUnits.filter(
    (unit) =>
      unit.headUserId === currentUser.id || isStructuralUnitHead(currentUser.id, unit, users),
  )
}

export function getPrimaryHeadedStructuralUnit(
  structuralUnits: StructuralUnit[],
  currentUser: User | null | undefined,
  users: User[],
): StructuralUnit | undefined {
  const headedUnits = getHeadedStructuralUnits(structuralUnits, currentUser, users)

  if (headedUnits.length === 0) {
    return undefined
  }

  const ownUnit = headedUnits.find((unit) => unit.id === currentUser?.structuralUnitId)

  return ownUnit ?? headedUnits[0]
}

export function getMonthSectionId(sectionId?: string): string | undefined {
  return sectionId?.trim() ? sectionId : undefined
}

export function findPendingMonthForView(
  pendingMonths: PprCalendarMonth[],
  structuralUnitId: string | undefined,
  year: number,
  month: number,
  sectionId?: string,
): PprCalendarMonth | undefined {
  if (!structuralUnitId) {
    return undefined
  }

  const normalizedSectionId = getMonthSectionId(sectionId)

  return pendingMonths.find(
    (item) =>
      item.structuralUnitId === structuralUnitId &&
      item.year === year &&
      item.month === month &&
      getMonthSectionId(item.sectionId) === normalizedSectionId,
  )
}

export function monthToViewScope(month: PprCalendarMonth): PprCalendarViewScope {
  if (month.sectionId) {
    return { type: 'section', sectionId: month.sectionId }
  }

  return { type: 'structure' }
}

export function buildEmptyCalendarMonth(params: {
  structuralUnitId: string
  sectionId?: string
  year: number
  month: number
}): PprCalendarMonth {
  return {
    id: '',
    structuralUnitId: params.structuralUnitId,
    sectionId: getMonthSectionId(params.sectionId),
    year: params.year,
    month: params.month,
    status: 'draft',
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function viewScopeToEntryFormScope(
  viewScope: PprCalendarViewScope | null | undefined,
): Pick<PprCalendarEntryFormSchema, 'scopeType' | 'entrySectionId'> {
  const resolved = viewScope ?? { type: 'structure' as const }

  if (resolved.type === 'structure') {
    return { scopeType: 'structure', entrySectionId: undefined }
  }

  return { scopeType: 'section', entrySectionId: resolved.sectionId }
}

export function entryToFormScope(
  entry: PprCalendarEntry,
): Pick<PprCalendarEntryFormSchema, 'scopeType' | 'entrySectionId'> {
  return {
    scopeType: entry.scopeType,
    entrySectionId: entry.sectionId,
  }
}

export function getViewScopeLabel(
  viewScope: PprCalendarViewScope | null | undefined,
  structuralUnit: Pick<StructuralUnit, 'sections'> | undefined,
  labels: { structure: string; section: string },
): string {
  const resolved = viewScope ?? { type: 'structure' as const }

  if (resolved.type === 'structure') {
    return labels.structure
  }

  const section = structuralUnit?.sections.find((item) => item.id === resolved.sectionId)

  return section ? `${labels.section}: ${section.shortName}` : labels.section
}
