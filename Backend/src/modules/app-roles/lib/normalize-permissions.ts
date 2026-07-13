import { PagePermissionDto } from '../dto/page-permission.dto';

function isPagePermission(value: unknown): value is PagePermissionDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const permission = value as Partial<PagePermissionDto>;

  return typeof permission.pageKey === 'string';
}

export function normalizePermissions(value: unknown): PagePermissionDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPagePermission).map((permission) => ({
    pageKey: permission.pageKey,
    canView: Boolean(permission.canView),
    canCreate: Boolean(permission.canCreate),
    canEdit: Boolean(permission.canEdit),
    canDelete: Boolean(permission.canDelete),
  }));
}
