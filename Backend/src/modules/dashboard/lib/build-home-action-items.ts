import type { PrismaService } from '../../../shared/prisma/prisma.service';
import { isApplicationFinalized } from '../../applications/lib/workflow-unit-status';
import { normalizeObjectIds, isPprExecutionOverdue, subtractCalendarDays } from '../../ppr-calendar/lib/normalize-ppr-calendar';
import type { DashboardUserContext } from './resolve-dashboard-access';

export interface PriorityIncomingApplicationItem {
  id: string;
  type: string;
  status: string;
  workflowStatus: string;
  createdAt: string;
  deadline?: string;
  createdByFirstName?: string;
  createdByLastName?: string;
  structuralUnitIds: string[];
  isOverdue: boolean;
  updatedAt: string;
}

export interface TodayPprTaskItem {
  entryId: string;
  monthId: string;
  date: string;
  pprTypeId: string;
  pprTypeName: string;
  structuralUnitId: string;
  sectionId?: string;
  objectIds: string[];
  completedObjectIds: string[];
  completionPercent: number;
  executionStatus: 'pending' | 'in_progress' | 'completed';
  canExecute: boolean;
  isOverdue: boolean;
  comment: string;
}

interface MappedApplication {
  id: string;
  type: string;
  status: string;
  workflowStatus: string;
  createdAt: string | Date;
  deadline?: string | null;
  createdByFirstName?: string | null;
  createdByLastName?: string | null;
  structuralUnitIds: string[];
  updatedAt: string | Date;
}

function normalizeStructuralUnitIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function applicationMatchesIncomingScope(
  application: { structuralUnitIds: unknown },
  scopedUnitIds: string[] | null,
): boolean {
  const unitIds = normalizeStructuralUnitIds(application.structuralUnitIds);

  if (!scopedUnitIds) {
    return unitIds.length > 0;
  }

  return unitIds.some((unitId) => scopedUnitIds.includes(unitId));
}

function getExecutionStatus(
  completionPercent: number,
): 'pending' | 'in_progress' | 'completed' {
  if (completionPercent === 0) {
    return 'pending';
  }

  if (completionPercent === 100) {
    return 'completed';
  }

  return 'in_progress';
}

function entryMatchesUserScope(
  entry: { scopeType: string; sectionId: string | null },
  user: {
    withoutSectionAccess: boolean;
    structuralUnitSectionId: string | null;
  },
): boolean {
  if (user.withoutSectionAccess) {
    return entry.scopeType === 'structure';
  }

  return (
    entry.scopeType === 'section' &&
    Boolean(user.structuralUnitSectionId) &&
    entry.sectionId === user.structuralUnitSectionId
  );
}

export function buildPriorityIncomingApplications(
  applications: MappedApplication[],
  scopedUnitIds: string[] | null,
  today: string,
  limit = 8,
): PriorityIncomingApplicationItem[] {
  return applications
    .filter(
      (application) =>
        applicationMatchesIncomingScope(application, scopedUnitIds) &&
        application.status === 'in_progress' &&
        !isApplicationFinalized(application),
    )
    .map((application) => {
      const isOverdue =
        Boolean(application.deadline) &&
        application.deadline! < today &&
        !isApplicationFinalized(application);

      return {
        id: application.id,
        type: application.type,
        status: application.status,
        workflowStatus: application.workflowStatus,
        createdAt:
          typeof application.createdAt === 'string'
            ? application.createdAt
            : new Date(application.createdAt).toISOString(),
        deadline: application.deadline ?? undefined,
        createdByFirstName: application.createdByFirstName ?? undefined,
        createdByLastName: application.createdByLastName ?? undefined,
        structuralUnitIds: application.structuralUnitIds,
        isOverdue,
        updatedAt:
          typeof application.updatedAt === 'string'
            ? application.updatedAt
            : new Date(application.updatedAt).toISOString(),
      };
    })
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      if (left.deadline && right.deadline && left.deadline !== right.deadline) {
        return left.deadline.localeCompare(right.deadline);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, limit);
}

export async function buildTodayPprTasks(
  prisma: PrismaService,
  context: DashboardUserContext & {
    withoutSectionAccess: boolean;
    structuralUnitSectionId: string | null;
  },
  today: string,
  limit = 20,
): Promise<TodayPprTaskItem[]> {
  const fromDate = subtractCalendarDays(today, 3) ?? today;
  const unitIds = context.canViewAll ? undefined : context.visibleUnitIds;
  const [fromYear, fromMonth] = fromDate.split('-').map(Number);
  const [todayYear, todayMonth] = today.split('-').map(Number);
  const monthPeriodFilter =
    fromYear === todayYear && fromMonth === todayMonth
      ? [{ year: todayYear, month: todayMonth }]
      : [
          { year: fromYear, month: fromMonth },
          { year: todayYear, month: todayMonth },
        ];

  const months = await prisma.pprCalendarMonth.findMany({
    where: {
      status: 'approved',
      OR: monthPeriodFilter,
      ...(unitIds ? { structuralUnitId: { in: unitIds } } : {}),
      ...(!context.canViewAll
        ? {
            sectionId: context.withoutSectionAccess
              ? ''
              : (context.structuralUnitSectionId ?? ''),
          }
        : {}),
    },
    include: {
      entries: {
        where: {
          date: {
            gte: fromDate,
            lte: today,
          },
        },
        include: { executions: true },
      },
    },
  });

  const tasks: TodayPprTaskItem[] = [];

  for (const monthRecord of months) {
    for (const entry of monthRecord.entries) {
      if (entry.date < fromDate || entry.date > today) {
        continue;
      }

      if (!context.canViewAll && !entryMatchesUserScope(entry, context)) {
        continue;
      }

      const objectIds = normalizeObjectIds(entry.objectIds);
      const completedObjectIds = entry.executions.map((item) => item.objectId);
      const completedCount = objectIds.filter((objectId) =>
        completedObjectIds.includes(objectId),
      ).length;
      const completionPercent =
        objectIds.length === 0
          ? 0
          : Math.round((completedCount / objectIds.length) * 100);
      const canExecute =
        monthRecord.structuralUnitId === context.structuralUnitId &&
        completionPercent < 100 &&
        objectIds.length > 0;

      tasks.push({
        entryId: entry.id,
        monthId: monthRecord.id,
        date: entry.date,
        pprTypeId: entry.pprTypeId,
        pprTypeName: '',
        structuralUnitId: monthRecord.structuralUnitId,
        sectionId: entry.sectionId ?? undefined,
        objectIds,
        completedObjectIds,
        completionPercent,
        executionStatus: getExecutionStatus(completionPercent),
        canExecute,
        isOverdue: isPprExecutionOverdue(entry.date),
        comment: entry.comment,
      });
    }
  }

  if (tasks.length === 0) {
    return [];
  }

  const pprTypeIds = [...new Set(tasks.map((task) => task.pprTypeId))];
  const pprTypes = await prisma.pprType.findMany({
    where: { id: { in: pprTypeIds } },
    select: { id: true, shortName: true, originalName: true },
  });
  const pprTypeNameById = new Map(
    pprTypes.map((pprType) => [
      pprType.id,
      pprType.shortName || pprType.originalName,
    ]),
  );

  return tasks
    .map((task) => ({
      ...task,
      pprTypeName: pprTypeNameById.get(task.pprTypeId) ?? task.pprTypeId,
    }))
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }

      if (left.executionStatus === 'completed' && right.executionStatus !== 'completed') {
        return 1;
      }

      if (right.executionStatus === 'completed' && left.executionStatus !== 'completed') {
        return -1;
      }

      return left.pprTypeName.localeCompare(right.pprTypeName, 'uz');
    })
    .slice(0, limit);
}
