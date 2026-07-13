import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/constants/error-codes';
import { Prisma } from '@prisma/client';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { findUsersByRoleId } from '../notifications/lib/notification-recipients';
import { NOTIFICATION_TYPES } from '../notifications/lib/notification-types';
import { summarizePermissionChanges } from '../notifications/lib/permission-diff';
import { CreateAppRoleDto } from './dto/create-app-role.dto';
import { UpdateAppRoleDto } from './dto/update-app-role.dto';
import { normalizePermissions } from './lib/normalize-permissions';
import { normalizeDocuments } from '../../common/lib/normalize-documents';

@Injectable()
export class AppRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.appRole
      .findMany({
        orderBy: { createdAt: 'desc' },
      })
      .then((roles) =>
        roles.map((role) => ({
          ...role,
          documents: normalizeDocuments(role.documents),
          permissions: normalizePermissions(role.permissions),
        })),
      );
  }

  async findOne(id: string) {
    const role = await this.prisma.appRole.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(ErrorCode.APP_ROLE_NOT_FOUND);
    }

    return {
      ...role,
      documents: normalizeDocuments(role.documents),
      permissions: normalizePermissions(role.permissions),
    };
  }

  async create(dto: CreateAppRoleDto) {
    const permissions = normalizePermissions(dto.permissions);
    const documents = normalizeDocuments(dto.documents);

    const role = await this.prisma.appRole.create({
      data: {
        name: dto.name,
        description: dto.description,
        documents: documents as unknown as Prisma.InputJsonValue,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        canViewAllStructuralUnits: dto.canViewAllStructuralUnits ?? false,
        isSystem: dto.isSystem ?? false,
      },
    });

    this.realtimeService.emitEntityChange('app-roles', 'create', role);

    return {
      ...role,
      documents: normalizeDocuments(role.documents),
      permissions: normalizePermissions(role.permissions),
    };
  }

  async update(id: string, dto: UpdateAppRoleDto) {
    const previousRole = await this.findOne(id);
    const previousPermissions = normalizePermissions(previousRole.permissions);

    const role = await this.prisma.appRole.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.documents !== undefined && {
          documents: normalizeDocuments(dto.documents) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.permissions !== undefined && {
          permissions: normalizePermissions(dto.permissions) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.canViewAllStructuralUnits !== undefined && {
          canViewAllStructuralUnits: dto.canViewAllStructuralUnits,
        }),
        ...(dto.isSystem !== undefined && { isSystem: dto.isSystem }),
      },
    });

    const nextPermissions = normalizePermissions(role.permissions);
    const permissionSummary = summarizePermissionChanges(previousPermissions, nextPermissions);
    const canViewAllChanged =
      dto.canViewAllStructuralUnits !== undefined &&
      dto.canViewAllStructuralUnits !== previousRole.canViewAllStructuralUnits;

    if (permissionSummary || canViewAllChanged) {
      const recipientUserIds = await findUsersByRoleId(this.prisma, id);
      const message = permissionSummary
        ? `"${role.name}" rolingizga yangi ruxsatlar qo'shildi yoki o'zgartirildi. ${permissionSummary}`
        : `"${role.name}" rolingizda barcha tashkiliy bo'limlarni ko'rish ruxsati o'zgartirildi.`;

      await this.notificationsService.createMany(
        recipientUserIds.map((userId) => ({
          userId,
          type: NOTIFICATION_TYPES.ROLE_PERMISSIONS_UPDATED,
          title: 'Rol ruxsatlari yangilandi',
          message,
          linkPath: '/',
          metadata: { roleId: role.id },
        })),
      );
    }

    this.realtimeService.emitEntityChange('app-roles', 'update', role);

    return {
      ...role,
      documents: normalizeDocuments(role.documents),
      permissions: normalizePermissions(role.permissions),
    };
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    await this.prisma.appRole.delete({ where: { id } });

    this.realtimeService.emitEntityChange('app-roles', 'delete', role);

    return { message: 'App role deleted successfully' };
  }
}
