import { ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { normalizePermissions } from '../../app-roles/lib/normalize-permissions';

export const PPR_MANAGEMENT_PAGE_KEY = '/management/ppr';

export async function assertPprManagementAccess(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { appRole: true },
  });

  if (!user) {
    throw new ForbiddenException(ErrorCode.PPR_CALENDAR_FORBIDDEN);
  }

  const role = user.appRole;

  if (role?.isSystem || role?.canViewAllStructuralUnits) {
    return user;
  }

  const permission = normalizePermissions(role?.permissions).find(
    (item) => item.pageKey === PPR_MANAGEMENT_PAGE_KEY,
  );

  if (!permission?.canView) {
    throw new ForbiddenException(ErrorCode.PPR_CALENDAR_FORBIDDEN);
  }

  return user;
}

export async function assertPprManagementDeleteAccess(prisma: PrismaService, userId: string) {
  const user = await assertPprManagementAccess(prisma, userId);
  const role = user.appRole;

  if (role?.isSystem || role?.canViewAllStructuralUnits) {
    return user;
  }

  const permission = normalizePermissions(role?.permissions).find(
    (item) => item.pageKey === PPR_MANAGEMENT_PAGE_KEY,
  );

  if (!permission?.canDelete) {
    throw new ForbiddenException(ErrorCode.PPR_CALENDAR_FORBIDDEN);
  }

  return user;
}
