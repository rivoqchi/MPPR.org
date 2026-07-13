import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../../common/pipes/pagination.dto';
import { ErrorCode } from '../../common/constants/error-codes';
import type { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateErrorLogDto } from './dto/create-error-log.dto';
import { GetErrorLogsQueryDto } from './dto/get-error-logs-query.dto';
import {
  assertErrorLogsEditAccess,
  assertErrorLogsViewAccess,
} from './lib/assert-error-logs-access';
import {
  sanitizeErrorMetadata,
  truncateStack,
} from './lib/sanitize-error-metadata';

interface ApiErrorLogInput {
  request: Request & { user?: AuthenticatedUser };
  code: string;
  message: string;
  category: 'user' | 'system';
  hintCode?: string;
  statusCode: number;
  errors: string[];
  stack?: string;
}

@Injectable()
export class ErrorLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: GetErrorLogsQueryDto) {
    await assertErrorLogsViewAccess(this.prisma, userId);

    const { page, limit, skip } = getPaginationParams(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.ErrorLogWhereInput = {
      ...(query.source ? { source: query.source } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(typeof query.resolved === 'boolean' ? { resolved: query.resolved } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
              { route: { contains: search, mode: 'insensitive' } },
              { apiPath: { contains: search, mode: 'insensitive' } },
              { userFullName: { contains: search, mode: 'insensitive' } },
              { userPhone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              position: true,
              roleId: true,
              appRole: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.errorLog.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createFromClient(userId: string, dto: CreateErrorLogDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    return this.prisma.errorLog.create({
      data: {
        source: dto.source,
        severity: dto.severity ?? 'user',
        code: dto.code,
        message: dto.message,
        hint: dto.hint,
        route: dto.route,
        apiPath: dto.apiPath,
        method: dto.method,
        statusCode: dto.statusCode,
        stack: truncateStack(dto.stack),
        userId: user?.id,
        userFullName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
        userPhone: user?.phone,
        userAgent: dto.userAgent,
        metadata: sanitizeErrorMetadata(dto.metadata) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createFromApiError(input: ApiErrorLogInput) {
    const userId = input.request.user?.id;
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        })
      : null;

    const routeHeader = input.request.headers['x-client-route'];
    const route = typeof routeHeader === 'string' ? routeHeader : undefined;

    return this.prisma.errorLog.create({
      data: {
        source: 'api',
        severity: input.category,
        code: input.code,
        message: input.message,
        hint: input.hintCode,
        route,
        apiPath: input.request.originalUrl ?? input.request.url,
        method: input.request.method,
        statusCode: input.statusCode,
        stack: truncateStack(input.stack),
        userId: user?.id,
        userFullName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
        userPhone: user?.phone,
        userAgent: input.request.headers['user-agent']?.toString(),
        metadata: sanitizeErrorMetadata({
          validationErrors: input.errors,
          ip: input.request.ip,
        }) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async markResolved(id: string, userId: string) {
    await assertErrorLogsEditAccess(this.prisma, userId);

    const existing = await this.prisma.errorLog.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return this.prisma.errorLog.update({
      where: { id },
      data: { resolved: true },
    });
  }
}
