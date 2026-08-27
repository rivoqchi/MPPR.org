import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  getPaginationParams,
  PaginationQueryDto,
} from '../../common/pipes/pagination.dto';
import { ErrorCode } from '../../common/constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async findAllForUser(userId: string, query: PaginationQueryDto, unreadOnly = false) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
      NOT: {
        OR: [
          { title: 'Welcome' },
          { message: { contains: 'Welcome to PPR.org API' } },
        ],
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        read: false,
        NOT: {
          OR: [
            { title: 'Welcome' },
            { message: { contains: 'Welcome to PPR.org API' } },
          ],
        },
      },
    });

    return { count };
  }

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        linkPath: dto.linkPath,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    const payload = {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    };

    this.websocketGateway.emitToUser(dto.userId, 'notification:created', payload);

    return payload;
  }

  async createMany(dtos: CreateNotificationDto[]) {
    const results = [];

    for (const dto of dtos) {
      results.push(await this.create(dto));
    }

    return results;
  }

  async markAsRead(id: string, userId: string, dto: UpdateNotificationDto) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: dto.read ?? true },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { updated: result.count };
  }
}
