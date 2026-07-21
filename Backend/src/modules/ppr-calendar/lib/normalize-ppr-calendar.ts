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

const APP_TIME_ZONE = 'Asia/Tashkent';

/** YYYY-MM-DD → UTC midnight epoch for calendar-day math (no timezone shift). */
function parseDateKey(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

function formatDateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Bajarish uchun faqat kelajak sanalari yopiq.
 * Eski sanalar istalgan paytda bajarilishi mumkin.
 */
export function isPprExecutionDateAllowed(entryDate: string, today = new Date()): boolean {
  const entryTime = parseDateKey(entryDate);

  if (entryTime === null) {
    return false;
  }

  const todayKey = formatDateKeyInTimeZone(today, APP_TIME_ZONE);
  const todayTime = parseDateKey(todayKey);

  if (todayTime === null) {
    return false;
  }

  return entryTime <= todayTime;
}

/**
 * Rejalashtirilgan sanadan 3 kundan ortiq o'tgan bo'lsa overdue.
 * Bugun 21 bo'lsa: 17 va undan eski overdue.
 */
export function isPprExecutionOverdue(entryDate: string, today = new Date()): boolean {
  const entryTime = parseDateKey(entryDate);

  if (entryTime === null) {
    return false;
  }

  const todayKey = formatDateKeyInTimeZone(today, APP_TIME_ZONE);
  const todayTime = parseDateKey(todayKey);

  if (todayTime === null) {
    return false;
  }

  const graceDeadline = entryTime + 3 * 24 * 60 * 60 * 1000;

  return todayTime > graceDeadline;
}

export function subtractCalendarDays(dateKey: string, days: number): string | null {
  const time = parseDateKey(dateKey);

  if (time === null) {
    return null;
  }

  const next = new Date(time);
  next.setUTCDate(next.getUTCDate() - days);

  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, '0');
  const day = String(next.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
