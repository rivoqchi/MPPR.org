import { ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { normalizePermissions } from '../../modules/app-roles/lib/normalize-permissions';

export type PagePermissionAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

export const PAGE_KEYS = {
  home: '/',
  guide: '/guide',
  settings: '/settings',
  chat: '/chat',
  profile: '/profile',
  applicationsSubmit: '/applications/submit',
  applicationsIncoming: '/applications/incoming',
  applicationsCalendar: '/applications/calendar',
  pprCalendar: '/ppr-calendar',
  pprType: '/registration/ppr-type',
  structuralUnits: '/registration/structural-units',
  objects: '/registration/objects',
  management: '/management',
  managementPpr: '/management/ppr',
  managementUsers: '/management/users',
  managementRoles: '/management/roles',
  managementEmployees: '/management/employees',
  managementPrograms: '/management/programs',
  managementErrors: '/management/errors',
  managementChanges: '/management/changes',
  documentsNew: '/documents/new',
  files: '/files',
  archives: '/archives',
  archivesNew: '/archives/new',
} as const;

export async function assertPagePermission(
  prisma: PrismaService,
  userId: string,
  pageKey: string,
  action: PagePermissionAction,
  errorCode: string = ErrorCode.FORBIDDEN,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { appRole: true },
  });

  if (!user) {
    throw new ForbiddenException(errorCode);
  }

  const role = user.appRole;

  if (role?.isSystem) {
    return user;
  }

  const permission = normalizePermissions(role?.permissions).find(
    (item) => item.pageKey === pageKey,
  );

  if (!permission?.[action]) {
    throw new ForbiddenException(errorCode);
  }

  return user;
}
