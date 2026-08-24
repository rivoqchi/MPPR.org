export type PprCalendarMonthStatus = 'draft' | 'pending_approval' | 'approved'

export type PprCalendarScopeType = 'section' | 'structure'

export type PprCalendarEntryExecutionStatus = 'pending' | 'in_progress' | 'completed'

export interface PprCalendarExecutionAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  kind: 'image' | 'file'
  dataUrl?: string
}

export interface PprCalendarObjectExecution {
  id: string
  entryId: string
  objectId: string
  images: PprCalendarExecutionAttachment[]
  files: PprCalendarExecutionAttachment[]
  comment: string
  executedByUserId: string
  createdAt: string
  updatedAt: string
}

export interface PprCalendarEntry {
  id: string
  monthId: string
  date: string
  pprTypeId: string
  objectIds: string[]
  scopeType: PprCalendarScopeType
  sectionId?: string
  comment: string
  createdByUserId: string
  createdAt: string
  updatedAt: string
  executions?: PprCalendarObjectExecution[]
}

export interface PprCalendarMonth {
  id: string
  structuralUnitId: string
  sectionId?: string
  year: number
  month: number
  status: PprCalendarMonthStatus
  submittedByUserId?: string
  submittedAt?: string
  approvedByUserId?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  entries: PprCalendarEntry[]
}

export interface PprCalendarMonthQuery {
  structuralUnitId: string
  sectionId?: string
  year: number
  month: number
}

export interface PprCalendarEntryFormValues {
  pprTypeId: string
  objectIds: string[]
  scopeType: PprCalendarScopeType
  entrySectionId?: string
  comment?: string
}

export interface MovePprCalendarEntryPayload {
  date: string
}

export interface CreatePprCalendarEntryPayload extends PprCalendarEntryFormValues {
  structuralUnitId: string
  sectionId?: string
  year: number
  month: number
  date: string
}

export type PprCalendarViewScope =
  | { type: 'structure' }
  | { type: 'section'; sectionId: string }

export interface ExecutePprCalendarEntryPayload {
  objectIds: string[]
  images?: PprCalendarExecutionAttachment[]
  files?: PprCalendarExecutionAttachment[]
  comment?: string
}
