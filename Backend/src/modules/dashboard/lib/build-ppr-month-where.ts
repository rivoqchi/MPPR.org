import { Prisma } from '@prisma/client';
import type { GetDashboardSummaryQueryDto } from '../dto/get-dashboard-summary-query.dto';

export function buildPprMonthWhere(
  query: GetDashboardSummaryQueryDto,
  scopedUnitIds: string[] | null,
): Prisma.PprCalendarMonthWhereInput {
  const where: Prisma.PprCalendarMonthWhereInput = {};

  if (scopedUnitIds) {
    where.structuralUnitId = { in: scopedUnitIds };
  } else if (query.structuralUnitId) {
    where.structuralUnitId = query.structuralUnitId;
  }

  if (query.sectionId) {
    where.sectionId = query.sectionId;
  } else if (query.scopeType === 'structure') {
    where.sectionId = '';
  } else if (query.scopeType === 'section') {
    where.sectionId = { not: '' };
  }

  return where;
}

export function filterMonthsByPeriod<
  T extends { year: number; month: number },
>(
  months: T[],
  query: GetDashboardSummaryQueryDto,
): T[] {
  const fromPeriod =
    query.fromYear !== undefined && query.fromMonth !== undefined
      ? query.fromYear * 12 + query.fromMonth
      : null;
  const toPeriod =
    query.toYear !== undefined && query.toMonth !== undefined
      ? query.toYear * 12 + query.toMonth
      : null;

  return months.filter((month) => {
    const period = month.year * 12 + month.month;

    if (fromPeriod !== null && period < fromPeriod) {
      return false;
    }

    if (toPeriod !== null && period > toPeriod) {
      return false;
    }

    return true;
  });
}

export function buildApplicationDateRange(
  query: GetDashboardSummaryQueryDto,
): { from?: Date; to?: Date } {
  const from =
    query.fromYear !== undefined && query.fromMonth !== undefined
      ? new Date(query.fromYear, query.fromMonth - 1, 1, 0, 0, 0, 0)
      : undefined;

  const to =
    query.toYear !== undefined && query.toMonth !== undefined
      ? new Date(query.toYear, query.toMonth, 0, 23, 59, 59, 999)
      : undefined;

  return { from, to };
}
