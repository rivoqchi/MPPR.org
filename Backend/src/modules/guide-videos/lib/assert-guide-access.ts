import { ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { normalizePermissions } from '../../app-roles/lib/normalize-permissions';

export const GUIDE_PAGE_KEY = '/guide';

type GuideAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

async function assertGuideAccess(
  prisma: PrismaService,
  userId: string,
  action: GuideAction,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { appRole: true },
  });

  if (!user) {
    throw new ForbiddenException(ErrorCode.GUIDE_VIDEO_FORBIDDEN);
  }

  const role = user.appRole;

  if (role?.isSystem) {
    return user;
  }

  const permission = normalizePermissions(role?.permissions).find(
    (item) => item.pageKey === GUIDE_PAGE_KEY,
  );

  if (!permission?.[action]) {
    throw new ForbiddenException(ErrorCode.GUIDE_VIDEO_FORBIDDEN);
  }

  return user;
}

export function assertGuideViewAccess(prisma: PrismaService, userId: string) {
  return assertGuideAccess(prisma, userId, 'canView');
}

export function assertGuideCreateAccess(prisma: PrismaService, userId: string) {
  return assertGuideAccess(prisma, userId, 'canCreate');
}

export function assertGuideEditAccess(prisma: PrismaService, userId: string) {
  return assertGuideAccess(prisma, userId, 'canEdit');
}

export function assertGuideDeleteAccess(prisma: PrismaService, userId: string) {
  return assertGuideAccess(prisma, userId, 'canDelete');
}
