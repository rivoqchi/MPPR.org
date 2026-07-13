import type {
  PprCalendarEntry,
  PprCalendarMonth,
  PprCalendarObjectExecution,
} from '@prisma/client';
import { normalizeAttachments } from '../../applications/lib/normalize-application';

export type PprCalendarMonthStatus = 'draft' | 'pending_approval' | 'approved';

export type PprCalendarScopeType = 'section' | 'structure';

export interface PprCalendarObjectExecutionRecord {
  id: string;
  entryId: string;
  objectId: string;
  images: ReturnType<typeof normalizeAttachments>;
  files: ReturnType<typeof normalizeAttachments>;
  comment: string;
  executedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PprCalendarEntryRecord {
  id: string;
  monthId: string;
  date: string;
  pprTypeId: string;
  objectIds: string[];
  scopeType: PprCalendarScopeType;
  sectionId?: string;
  comment: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  executions: PprCalendarObjectExecutionRecord[];
}

export interface PprCalendarMonthRecord {
  id: string;
  structuralUnitId: string;
  sectionId?: string;
  year: number;
  month: number;
  status: PprCalendarMonthStatus;
  submittedByUserId?: string;
  submittedAt?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  entries: PprCalendarEntryRecord[];
}

export function normalizeObjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function mapPprCalendarObjectExecutionRecord(
  execution: PprCalendarObjectExecution,
): PprCalendarObjectExecutionRecord {
  return {
    id: execution.id,
    entryId: execution.entryId,
    objectId: execution.objectId,
    images: normalizeAttachments(execution.images),
    files: normalizeAttachments(execution.files),
    comment: execution.comment,
    executedByUserId: execution.executedByUserId,
    createdAt: execution.createdAt.toISOString(),
    updatedAt: execution.updatedAt.toISOString(),
  };
}

export function mapPprCalendarEntryRecord(
  entry: PprCalendarEntry & { executions?: PprCalendarObjectExecution[] },
): PprCalendarEntryRecord {
  return {
    id: entry.id,
    monthId: entry.monthId,
    date: entry.date,
    pprTypeId: entry.pprTypeId,
    objectIds: normalizeObjectIds(entry.objectIds),
    scopeType: entry.scopeType as PprCalendarScopeType,
    sectionId: entry.sectionId ?? undefined,
    comment: entry.comment,
    createdByUserId: entry.createdByUserId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    executions: (entry.executions ?? []).map((item) => mapPprCalendarObjectExecutionRecord(item)),
  };
}

export function mapPprCalendarMonthRecord(
  month: PprCalendarMonth & {
    entries?: Array<PprCalendarEntry & { executions?: PprCalendarObjectExecution[] }>;
  },
): PprCalendarMonthRecord {
  return {
    id: month.id,
    structuralUnitId: month.structuralUnitId,
    sectionId: month.sectionId || undefined,
    year: month.year,
    month: month.month,
    status: month.status as import('./normalize-ppr-calendar').PprCalendarMonthStatus,
    submittedByUserId: month.submittedByUserId ?? undefined,
    submittedAt: month.submittedAt?.toISOString(),
    approvedByUserId: month.approvedByUserId ?? undefined,
    approvedAt: month.approvedAt?.toISOString(),
    createdAt: month.createdAt.toISOString(),
    updatedAt: month.updatedAt.toISOString(),
    entries: (month.entries ?? []).map((entry) => mapPprCalendarEntryRecord(entry)),
  };
}

export function resolveMonthSectionId(sectionId?: string | null): string {
  return sectionId?.trim() ? sectionId : '';
}

export function isPprExecutionDateAllowed(entryDate: string, today = new Date()): boolean {
  const entry = new Date(`${entryDate}T00:00:00.000Z`);

  if (Number.isNaN(entry.getTime())) {
    return false;
  }

  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const minUtc = new Date(todayUtc);
  minUtc.setUTCDate(minUtc.getUTCDate() - 3);

  return entry.getTime() >= minUtc.getTime() && entry.getTime() <= todayUtc.getTime();
}
