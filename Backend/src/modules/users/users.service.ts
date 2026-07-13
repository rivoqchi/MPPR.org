import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { ErrorCode } from '../../common/constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPES } from '../notifications/lib/notification-types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { USER_PUBLIC_SELECT } from './lib/user-select';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: USER_PUBLIC_SELECT,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException(ErrorCode.PHONE_ALREADY_REGISTERED);
    }

    const existingTabelNumber = await this.prisma.user.findUnique({
      where: { tabelNumber: dto.tabelNumber },
    });

    if (existingTabelNumber) {
      throw new ConflictException(ErrorCode.TABEL_NUMBER_ALREADY_REGISTERED);
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate,
        phone: dto.phone,
        tabelNumber: dto.tabelNumber,
        position: dto.position,
        roleId: dto.roleId,
        structuralUnitId: dto.structuralUnitId,
        withoutSectionAccess: dto.withoutSectionAccess ?? false,
        structuralUnitSectionId: dto.structuralUnitSectionId,
        avatar: dto.avatar,
        password: hashedPassword,
        isActive: true,
      },
      select: USER_PUBLIC_SELECT,
    });

    this.realtimeService.emitEntityChange('users', 'create', user);

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const previousUser = await this.findOne(id);

    if (dto.isActive === false && actorId && actorId === id) {
      throw new BadRequestException(ErrorCode.USER_CANNOT_DEACTIVATE_SELF);
    }

    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(ErrorCode.PHONE_ALREADY_IN_USE);
      }
    }

    const data: {
      firstName?: string;
      lastName?: string;
      birthDate?: string;
      phone?: string;
      tabelNumber?: string;
      position?: string;
      roleId?: string;
      structuralUnitId?: string;
      withoutSectionAccess?: boolean;
      structuralUnitSectionId?: string | null;
      avatar?: string;
      password?: string;
      isActive?: boolean;
      refreshToken?: string | null;
    } = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.tabelNumber !== undefined) {
      const existingTabelNumber = await this.prisma.user.findUnique({
        where: { tabelNumber: dto.tabelNumber },
      });

      if (existingTabelNumber && existingTabelNumber.id !== id) {
        throw new ConflictException(ErrorCode.TABEL_NUMBER_ALREADY_IN_USE);
      }

      data.tabelNumber = dto.tabelNumber;
    }
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.roleId !== undefined) data.roleId = dto.roleId;
    if (dto.structuralUnitId !== undefined) {
      data.structuralUnitId = dto.structuralUnitId;
    }
    if (dto.withoutSectionAccess !== undefined) {
      data.withoutSectionAccess = dto.withoutSectionAccess;
    }
    if (dto.structuralUnitSectionId !== undefined) {
      data.structuralUnitSectionId = dto.structuralUnitSectionId;
    }
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;

      if (!dto.isActive) {
        data.refreshToken = null;
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_PUBLIC_SELECT,
    });

    if (dto.roleId !== undefined && dto.roleId !== previousUser.roleId) {
      const role = await this.prisma.appRole.findUnique({
        where: { id: dto.roleId },
        select: { name: true },
      });

      await this.notificationsService.create({
        userId: id,
        type: NOTIFICATION_TYPES.USER_ROLE_CHANGED,
        title: 'Rolingiz o\'zgartirildi',
        message: `Sizga "${role?.name ?? 'yangi rol'}" roli biriktirildi.`,
        linkPath: '/profile',
        metadata: { roleId: dto.roleId },
      });
    } else if (dto.isActive !== undefined && dto.isActive !== previousUser.isActive) {
      await this.notificationsService.create({
        userId: id,
        type: NOTIFICATION_TYPES.USER_ACCESS_CHANGED,
        title: dto.isActive ? 'Hisobingiz faollashtirildi' : 'Hisobingiz faolsizlashtirildi',
        message: dto.isActive
          ? 'Endi tizimga kirishingiz mumkin.'
          : 'Hisobingiz vaqtincha faolsiz. Administrator bilan bog\'laning.',
        linkPath: '/profile',
      });
    } else if (
      (dto.structuralUnitId !== undefined &&
        dto.structuralUnitId !== previousUser.structuralUnitId) ||
      (dto.withoutSectionAccess !== undefined &&
        dto.withoutSectionAccess !== previousUser.withoutSectionAccess) ||
      (dto.structuralUnitSectionId !== undefined &&
        dto.structuralUnitSectionId !== previousUser.structuralUnitSectionId)
    ) {
      await this.notificationsService.create({
        userId: id,
        type: NOTIFICATION_TYPES.USER_ACCESS_CHANGED,
        title: 'Kirish huquqlari yangilandi',
        message: 'Tashkiliy bo\'lim yoki bo\'lim ruxsatingiz o\'zgartirildi.',
        linkPath: '/profile',
      });
    }

    this.realtimeService.emitEntityChange('users', 'update', user);

    return user;
  }

  async remove(id: string) {
    const user = await this.findOne(id);

    await this.prisma.user.delete({ where: { id } });

    this.realtimeService.emitEntityChange('users', 'delete', user);

    return { message: 'User deleted successfully' };
  }
}
