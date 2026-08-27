import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  assertPagePermission,
  PAGE_KEYS,
} from '../../common/lib/assert-page-permission';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { ErrorCode } from '../../common/constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPES } from '../notifications/lib/notification-types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { USER_PUBLIC_SELECT } from './lib/user-select';

const BCRYPT_ROUNDS = 12;
const ONLINE_USERS_SET_KEY = 'presence:users:online';

type UserPublic = Prisma.UserGetPayload<{ select: typeof USER_PUBLIC_SELECT }>;
type UserWithPresence = UserPublic & { isOnline: boolean };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getUserConnectionKey(userId: string) {
    return `presence:user:${userId}:connections`;
  }

  private async enrichUser(user: UserPublic): Promise<UserWithPresence> {
    const isOnline =
      (await this.redisService.getClient().sismember(ONLINE_USERS_SET_KEY, user.id)) === 1;

    return {
      ...user,
      isOnline,
    };
  }

  private async enrichUsers(users: UserPublic[]): Promise<UserWithPresence[]> {
    const onlineUserIds = new Set(await this.redisService.getClient().smembers(ONLINE_USERS_SET_KEY));

    return users.map((user) => ({
      ...user,
      isOnline: onlineUserIds.has(user.id),
    }));
  }

  async getOnlineUserIds(): Promise<Set<string>> {
    return new Set(await this.redisService.getClient().smembers(ONLINE_USERS_SET_KEY));
  }

  async setUserOnline(userId: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const connectionCount = await redis.incr(this.getUserConnectionKey(userId));

    if (connectionCount === 1) {
      await redis.sadd(ONLINE_USERS_SET_KEY, userId);
      return true;
    }

    return false;
  }

  async setUserOffline(userId: string): Promise<Date | null> {
    const redis = this.redisService.getClient();
    const connectionKey = this.getUserConnectionKey(userId);
    const remainingConnections = await redis.decr(connectionKey);

    if (remainingConnections > 0) {
      return null;
    }

    await redis.del(connectionKey);
    await redis.srem(ONLINE_USERS_SET_KEY, userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
      select: { lastSeenAt: true },
    });

    return user.lastSeenAt;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: USER_PUBLIC_SELECT,
    });

    return this.enrichUsers(users);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    return this.enrichUser(user);
  }

  async create(dto: CreateUserDto, actorId: string) {
    await assertPagePermission(
      this.prisma,
      actorId,
      PAGE_KEYS.managementUsers,
      'canCreate',
    );

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

    this.realtimeService.emitEntityChange('users', 'create', await this.enrichUser(user));

    return this.enrichUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const previousUser = await this.findOne(id);

    if (dto.isActive === false && actorId && actorId === id) {
      throw new BadRequestException(ErrorCode.USER_CANNOT_DEACTIVATE_SELF);
    }

    const isSelfUpdate = Boolean(actorId && actorId === id);
    const hasAdminFields =
      dto.roleId !== undefined ||
      dto.structuralUnitId !== undefined ||
      dto.withoutSectionAccess !== undefined ||
      dto.structuralUnitSectionId !== undefined ||
      dto.isActive !== undefined ||
      dto.tabelNumber !== undefined ||
      dto.position !== undefined;

    if (actorId && !(isSelfUpdate && !hasAdminFields)) {
      await assertPagePermission(
        this.prisma,
        actorId,
        PAGE_KEYS.managementUsers,
        'canEdit',
      );
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

      if (dto.withoutSectionAccess) {
        data.structuralUnitSectionId = null;
      }
    }
    if (dto.structuralUnitSectionId !== undefined && dto.withoutSectionAccess !== true) {
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

    this.realtimeService.emitEntityChange('users', 'update', await this.enrichUser(user));

    return this.enrichUser(user);
  }

  async remove(id: string, actorId: string) {
    await assertPagePermission(
      this.prisma,
      actorId,
      PAGE_KEYS.managementUsers,
      'canDelete',
    );

    const user = await this.findOne(id);

    await this.prisma.user.delete({ where: { id } });

    this.realtimeService.emitEntityChange('users', 'delete', user);

    return { message: 'User deleted successfully' };
  }
}
