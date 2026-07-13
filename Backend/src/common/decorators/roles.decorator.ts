import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roleIds: string[]) => SetMetadata(ROLES_KEY, roleIds);
