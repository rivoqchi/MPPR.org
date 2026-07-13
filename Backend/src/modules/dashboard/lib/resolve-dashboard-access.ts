import { ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { resolveStructuralUnitHeadUserId } from '../../structural-units/lib/resolve-head-user';

export interface DashboardUserContext {
  userId: string;
  firstName: string;
  lastName: string;
  structuralUnitId: string;
  canViewAll: boolean;
  visibleUnitIds: string[];
  headedUnitIds: string[];
}

async function isUserHeadOfUnit(
  prisma: PrismaService,
  userId: string,
  userFirstName: string,
  userLastName: string,
  unit: { id: string; headUserId: string | null; headFullName: string },
): Promise<boolean> {
  if (unit.headUserId === userId) {
    return true;
  }

  const headUserId = await resolveStructuralUnitHeadUserId(prisma, unit);

  if (headUserId === userId) {
    return true;
  }

  const userName = `${userFirstName} ${userLastName}`.trim().toLowerCase();
  const headName = unit.headFullName.trim().toLowerCase();

  return Boolean(userName && headName && userName === headName);
}

export async function resolveDashboardUserContext(
  prisma: PrismaService,
  userId: string,
): Promise<DashboardUserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      structuralUnitId: true,
      appRole: {
        select: {
          isSystem: true,
          canViewAllStructuralUnits: true,
        },
      },
    },
  });

  if (!user) {
    throw new ForbiddenException(ErrorCode.DASHBOARD_FORBIDDEN);
  }

  const canViewAll = Boolean(
    user.appRole?.isSystem || user.appRole?.canViewAllStructuralUnits,
  );

  const headedUnitIds: string[] = [];

  if (!canViewAll) {
    const units = await prisma.structuralUnit.findMany({
      select: {
        id: true,
        headUserId: true,
        headFullName: true,
      },
    });

    for (const unit of units) {
      if (
        await isUserHeadOfUnit(
          prisma,
          user.id,
          user.firstName,
          user.lastName,
          unit,
        )
      ) {
        headedUnitIds.push(unit.id);
      }
    }
  }

  const visibleUnitIds = canViewAll
    ? []
    : Array.from(new Set([user.structuralUnitId, ...headedUnitIds]));

  return {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    structuralUnitId: user.structuralUnitId,
    canViewAll,
    visibleUnitIds,
    headedUnitIds,
  };
}

export function resolveScopedStructuralUnitIds(
  context: DashboardUserContext,
  requestedUnitId?: string,
): string[] | null {
  if (requestedUnitId) {
    if (context.canViewAll) {
      return [requestedUnitId];
    }

    if (!context.visibleUnitIds.includes(requestedUnitId)) {
      throw new ForbiddenException(ErrorCode.DASHBOARD_FORBIDDEN);
    }

    return [requestedUnitId];
  }

  if (context.canViewAll) {
    return null;
  }

  return context.visibleUnitIds;
}
