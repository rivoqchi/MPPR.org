import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  mapApplicationRecord,
  normalizeStructuralUnitIds,
} from '../applications/lib/normalize-application';
import { isApplicationFinalized } from '../applications/lib/workflow-unit-status';
import { normalizeObjectIds } from '../ppr-calendar/lib/normalize-ppr-calendar';
import type { GetDashboardSummaryQueryDto } from './dto/get-dashboard-summary-query.dto';
import {
  buildApplicationDateRange,
  buildPprMonthWhere,
  filterMonthsByPeriod,
} from './lib/build-ppr-month-where';
import {
  resolveDashboardUserContext,
  resolveScopedStructuralUnitIds,
} from './lib/resolve-dashboard-access';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function applicationMatchesScope(
  application: {
    structuralUnitIds: unknown;
    createdByStructuralUnitId: string | null;
  },
  scopedUnitIds: string[] | null,
  applicationScope: 'all' | 'submitted' | 'incoming',
): boolean {
  const unitIds = normalizeStructuralUnitIds(application.structuralUnitIds);
  const createdByUnitId = application.createdByStructuralUnitId ?? undefined;

  const inScope = (unitId: string | undefined) => {
    if (!unitId) {
      return false;
    }

    if (!scopedUnitIds) {
      return true;
    }

    return scopedUnitIds.includes(unitId);
  };

  const isSubmitted = inScope(createdByUnitId);
  const isIncoming = unitIds.some((unitId) => inScope(unitId));

  switch (applicationScope) {
    case 'submitted':
      return isSubmitted;
    case 'incoming':
      return isIncoming;
    default:
      return isSubmitted || isIncoming;
  }
}

@Injectable()
export class DashboardService {
  private readonly monthWithEntriesInclude = {
    entries: {
      include: { executions: true },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: GetDashboardSummaryQueryDto, user: AuthenticatedUser) {
    const context = await resolveDashboardUserContext(this.prisma, user.id);
    const scopedUnitIds = resolveScopedStructuralUnitIds(
      context,
      query.structuralUnitId,
    );
    const applicationScope = query.applicationScope ?? 'all';
    const { from, to } = buildApplicationDateRange(query);
    const today = getTodayDateString();

    const pprMonthWhere = buildPprMonthWhere(query, scopedUnitIds);

    const [
      unreadNotifications,
      pprMonths,
      rawApplications,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
      this.prisma.pprCalendarMonth.findMany({
        where: pprMonthWhere,
        include: this.monthWithEntriesInclude,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.application.findMany({
        where: {
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const filteredPprMonths = filterMonthsByPeriod(pprMonths, query);

    const applications = rawApplications
      .filter((application) =>
        applicationMatchesScope(application, scopedUnitIds, applicationScope),
      )
      .map((application) => mapApplicationRecord(application));

    const applicationStats = {
      total: applications.length,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      submitted: 0,
      incoming: 0,
    };

    const upcomingDeadlines: Array<{
      id: string;
      type: string;
      status: string;
      workflowStatus: string;
      deadline?: string;
      createdByFirstName?: string;
      createdByLastName?: string;
      isOverdue: boolean;
      daysRemaining: number | null;
    }> = [];

    for (const application of applications) {
      const unitIds = application.structuralUnitIds;
      const createdByUnitId = application.createdByStructuralUnitId;
      const inSubmittedScope =
        !scopedUnitIds ||
        (createdByUnitId ? scopedUnitIds.includes(createdByUnitId) : false);
      const inIncomingScope = unitIds.some((unitId) =>
        scopedUnitIds ? scopedUnitIds.includes(unitId) : true,
      );

      if (inSubmittedScope) {
        applicationStats.submitted += 1;
      }

      if (inIncomingScope) {
        applicationStats.incoming += 1;
      }

      if (application.status === 'in_progress') {
        applicationStats.inProgress += 1;
      } else if (application.status === 'completed') {
        applicationStats.completed += 1;
      } else if (application.status === 'cancelled') {
        applicationStats.cancelled += 1;
      }

      const isOverdue =
        Boolean(application.deadline) &&
        application.deadline! < today &&
        !isApplicationFinalized(application);

      if (isOverdue) {
        applicationStats.overdue += 1;
      }

      if (
        application.deadline &&
        !isApplicationFinalized(application)
      ) {
        const deadlineDate = new Date(`${application.deadline}T00:00:00`);
        const todayDate = new Date(`${today}T00:00:00`);
        const diffMs = deadlineDate.getTime() - todayDate.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 14) {
          upcomingDeadlines.push({
            id: application.id,
            type: application.type,
            status: application.status,
            workflowStatus: application.workflowStatus,
            deadline: application.deadline,
            createdByFirstName: application.createdByFirstName ?? undefined,
            createdByLastName: application.createdByLastName ?? undefined,
            isOverdue,
            daysRemaining,
          });
        }
      }
    }

    upcomingDeadlines.sort((left, right) => {
      if (!left.deadline || !right.deadline) {
        return 0;
      }

      return left.deadline.localeCompare(right.deadline);
    });

    const pprMonthStatus = {
      draft: 0,
      pendingApproval: 0,
      approved: 0,
    };

    let plannedExecutions = 0;
    let completedExecutions = 0;

    for (const month of filteredPprMonths) {
      if (month.status === 'draft') {
        pprMonthStatus.draft += 1;
      } else if (month.status === 'pending_approval') {
        pprMonthStatus.pendingApproval += 1;
      } else if (month.status === 'approved') {
        pprMonthStatus.approved += 1;
      }

      if (month.status === 'approved') {
        for (const entry of month.entries) {
          const objectIds = normalizeObjectIds(entry.objectIds);
          plannedExecutions += objectIds.length;
          completedExecutions += entry.executions.length;
        }
      }
    }

    const executionPercent =
      plannedExecutions > 0
        ? Math.round((completedExecutions / plannedExecutions) * 100)
        : 0;

    const recentApplications = applications.slice(0, 8).map((application) => ({
      id: application.id,
      type: application.type,
      status: application.status,
      workflowStatus: application.workflowStatus,
      deadline: application.deadline,
      createdByFirstName: application.createdByFirstName,
      createdByLastName: application.createdByLastName,
      createdByStructuralUnitId: application.createdByStructuralUnitId,
      structuralUnitIds: application.structuralUnitIds,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      isOverdue:
        Boolean(application.deadline) &&
        application.deadline! < today &&
        !isApplicationFinalized(application),
    }));

    return {
      context: {
        userName: `${context.firstName} ${context.lastName}`.trim(),
        structuralUnitId: context.structuralUnitId,
        canViewAll: context.canViewAll,
        headedUnitIds: context.headedUnitIds,
      },
      filters: {
        structuralUnitId: query.structuralUnitId ?? null,
        scopeType: query.scopeType ?? null,
        sectionId: query.sectionId ?? null,
        fromYear: query.fromYear ?? null,
        fromMonth: query.fromMonth ?? null,
        toYear: query.toYear ?? null,
        toMonth: query.toMonth ?? null,
        applicationScope,
      },
      kpis: {
        applications: applicationStats,
        ppr: {
          draftMonths: pprMonthStatus.draft,
          pendingApprovalMonths: pprMonthStatus.pendingApproval,
          approvedMonths: pprMonthStatus.approved,
          plannedExecutions,
          completedExecutions,
          executionPercent,
        },
        notifications: {
          unread: unreadNotifications,
        },
      },
      recentApplications,
      upcomingDeadlines: upcomingDeadlines.slice(0, 8),
      recentNotifications: recentNotifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        linkPath: notification.linkPath,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      })),
    };
  }
}
