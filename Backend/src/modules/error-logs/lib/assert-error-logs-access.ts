import { ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { normalizePermissions } from '../../app-roles/lib/normalize-permissions';

export const ERROR_LOGS_PAGE_KEY = '/management/errors';

export async function assertErrorLogsViewAccess(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { appRole: true },
  });

  if (!user) {
    throw new ForbiddenException(ErrorCode.ERROR_LOG_FORBIDDEN);
  }

  const role = user.appRole;

  if (role?.isSystem) {
    return user;
  }

  const permission = normalizePermissions(role?.permissions).find(
    (item) => item.pageKey === ERROR_LOGS_PAGE_KEY,
  );

  if (!permission?.canView) {
    throw new ForbiddenException(ErrorCode.ERROR_LOG_FORBIDDEN);
  }

  return user;
}

export async function assertErrorLogsEditAccess(prisma: PrismaService, userId: string) {
  const user = await assertErrorLogsViewAccess(prisma, userId);
  const role = user.appRole;

  if (role?.isSystem) {
    return user;
  }

  const permission = normalizePermissions(role?.permissions).find(
    (item) => item.pageKey === ERROR_LOGS_PAGE_KEY,
  );

  if (!permission?.canEdit) {
    throw new ForbiddenException(ErrorCode.ERROR_LOG_FORBIDDEN);
  }

  return user;
}
