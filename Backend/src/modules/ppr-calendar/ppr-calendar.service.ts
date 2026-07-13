import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import type { AuthenticatedUser } from '../../common/types';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPES } from '../notifications/lib/notification-types';
import { resolveStructuralUnitHeadUserId } from '../structural-units/lib/resolve-head-user';
import {
  CreatePprCalendarEntryDto,
  GetApprovedPprCalendarMonthsQueryDto,
  GetPendingPprCalendarMonthsQueryDto,
  GetPprCalendarMonthQueryDto,
  UpdatePprCalendarEntryDto,
} from './dto/ppr-calendar.dto';
import { ExecutePprCalendarEntryDto } from './dto/ppr-calendar-execution.dto';
import {
  isPprExecutionDateAllowed,
  mapPprCalendarMonthRecord,
  normalizeObjectIds,
  resolveMonthSectionId,
  type PprCalendarMonthRecord,
} from './lib/normalize-ppr-calendar';
import { normalizeAttachments } from '../applications/lib/normalize-application';
import { buildPprCalendarLinkPath } from './lib/build-ppr-calendar-link';
import {
  assertPprManagementAccess,
  assertPprManagementDeleteAccess,
} from './lib/assert-ppr-management-access';

@Injectable()
export class PprCalendarService {
  private readonly monthWithEntriesInclude = {
    entries: {
      orderBy: { date: 'asc' as const },
      include: { executions: true },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getUserContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        structuralUnitId: true,
        appRole: {
          select: {
            isSystem: true,
            canViewAllStructuralUnits: true,
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException(ErrorCode.PPR_CALENDAR_FORBIDDEN);
    }

    return user;
  }

  private canViewAllStructuralUnits(
    user: {
      appRole: { isSystem: boolean; canViewAllStructuralUnits: boolean } | null;
    },
  ): boolean {
    const role = user.appRole;

    return Boolean(role?.isSystem || role?.canViewAllStructuralUnits);
  }

  private async assertUnitViewAccess(userId: string, structuralUnitId: string) {
    const user = await this.getUserContext(userId);

    if (user.structuralUnitId === structuralUnitId) {
      return user;
    }

    if (this.canViewAllStructuralUnits(user)) {
      return user;
    }

    await this.assertHeadAccess(userId, structuralUnitId);

    return user;
  }

  private async getStructuralUnitOrThrow(structuralUnitId: string) {
    const unit = await this.prisma.structuralUnit.findUnique({
      where: { id: structuralUnitId },
    });

    if (!unit) {
      throw new NotFoundException(ErrorCode.STRUCTURAL_UNIT_NOT_FOUND);
    }

    return unit;
  }

  private async resolveHeadUserId(unit: { id: string; headUserId: string | null; headFullName: string }) {
    return resolveStructuralUnitHeadUserId(this.prisma, unit);
  }

  private async assertUnitMemberAccess(userId: string, structuralUnitId: string) {
    const user = await this.getUserContext(userId);

    if (user.structuralUnitId !== structuralUnitId) {
      throw new ForbiddenException(ErrorCode.PPR_CALENDAR_FORBIDDEN);
    }

    return user;
  }

  private async isUserHeadOfUnit(
    userId: string,
    unit: { id: string; headUserId: string | null; headFullName: string },
  ): Promise<boolean> {
    if (unit.headUserId === userId) {
      return true;
    }

    const headUserId = await this.resolveHeadUserId(unit);

    if (headUserId === userId) {
      return true;
    }

    const user = await this.getUserContext(userId);
    const userName = `${user.firstName} ${user.lastName}`.trim().toLowerCase();
    const headName = unit.headFullName.trim().toLowerCase();

    if (userName && headName && userName === headName) {
      if (unit.headUserId !== userId) {
        await this.prisma.structuralUnit.update({
          where: { id: unit.id },
          data: { headUserId: userId },
        });
      }

      return true;
    }

    return false;
  }

  private async assertHeadAccess(userId: string, structuralUnitId: string) {
    const unit = await this.getStructuralUnitOrThrow(structuralUnitId);
    const isHead = await this.isUserHeadOfUnit(userId, unit);

    if (!isHead) {
      throw new ForbiddenException(ErrorCode.PPR_CALENDAR_FORBIDDEN);
    }

    return unit;
  }

  private async findHeadedStructuralUnitIds(userId: string): Promise<string[]> {
    const units = await this.prisma.structuralUnit.findMany({
      select: {
        id: true,
        headUserId: true,
        headFullName: true,
      },
    });

    const headedUnitIds: string[] = [];

    for (const unit of units) {
      if (await this.isUserHeadOfUnit(userId, unit)) {
        headedUnitIds.push(unit.id);
      }
    }

    return headedUnitIds;
  }

  private async getMonthOrThrow(id: string) {
    const month = await this.prisma.pprCalendarMonth.findUnique({
      where: { id },
      include: this.monthWithEntriesInclude,
    });

    if (!month) {
      throw new NotFoundException(ErrorCode.PPR_CALENDAR_MONTH_NOT_FOUND);
    }

    return month;
  }

  private async getEntryOrThrow(id: string) {
    const entry = await this.prisma.pprCalendarEntry.findUnique({
      where: { id },
      include: {
        executions: true,
        month: {
          include: this.monthWithEntriesInclude,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(ErrorCode.PPR_CALENDAR_ENTRY_NOT_FOUND);
    }

    return entry;
  }

  private assertMonthEditable(status: string) {
    if (status !== 'draft') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_EDITABLE);
    }
  }

  private validateEntryScope(
    scopeType: 'section' | 'structure',
    entrySectionId?: string,
  ) {
    if (scopeType === 'section' && !entrySectionId) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    if (scopeType === 'structure' && entrySectionId) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }
  }

  private async findOrCreateDraftMonth(params: {
    structuralUnitId: string;
    sectionId?: string | null;
    year: number;
    month: number;
  }) {
    const sectionId = resolveMonthSectionId(params.sectionId);

    const existing = await this.prisma.pprCalendarMonth.findFirst({
      where: {
        structuralUnitId: params.structuralUnitId,
        sectionId,
        year: params.year,
        month: params.month,
      },
      include: this.monthWithEntriesInclude,
    });

    if (existing) {
      return existing;
    }

    return this.prisma.pprCalendarMonth.create({
      data: {
        structuralUnitId: params.structuralUnitId,
        sectionId,
        year: params.year,
        month: params.month,
        status: 'draft',
      },
      include: this.monthWithEntriesInclude,
    });
  }

  private emitMonthChange(month: PprCalendarMonthRecord, action: 'create' | 'update' | 'delete') {
    this.realtimeService.emitEntityChange('ppr-calendar', action, month);
  }

  async getMonth(query: GetPprCalendarMonthQueryDto, user: AuthenticatedUser) {
    await this.assertUnitViewAccess(user.id, query.structuralUnitId);

    const sectionId = resolveMonthSectionId(query.sectionId);
    const month = await this.prisma.pprCalendarMonth.findFirst({
      where: {
        structuralUnitId: query.structuralUnitId,
        sectionId,
        year: query.year,
        month: query.month,
      },
      include: { entries: { orderBy: { date: 'asc' }, include: { executions: true } } },
    });

    if (!month) {
      return mapPprCalendarMonthRecord({
        id: '',
        structuralUnitId: query.structuralUnitId,
        sectionId,
        year: query.year,
        month: query.month,
        status: 'draft',
        submittedByUserId: null,
        submittedAt: null,
        approvedByUserId: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: [],
      });
    }

    return mapPprCalendarMonthRecord(month);
  }

  async getPendingMonths(query: GetPendingPprCalendarMonthsQueryDto, user: AuthenticatedUser) {
    const structuralUnitIds = query.structuralUnitId
      ? [query.structuralUnitId]
      : await this.findHeadedStructuralUnitIds(user.id);

    if (structuralUnitIds.length === 0) {
      return [];
    }

    for (const structuralUnitId of structuralUnitIds) {
      await this.assertHeadAccess(user.id, structuralUnitId);
    }

    const months = await this.prisma.pprCalendarMonth.findMany({
      where: {
        structuralUnitId: { in: structuralUnitIds },
        status: 'pending_approval',
      },
      include: this.monthWithEntriesInclude,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return months.map((month) => mapPprCalendarMonthRecord(month));
  }

  async createEntry(dto: CreatePprCalendarEntryDto, user: AuthenticatedUser) {
    await this.assertUnitMemberAccess(user.id, dto.structuralUnitId);
    this.validateEntryScope(dto.scopeType, dto.entrySectionId);

    const monthSectionId = resolveMonthSectionId(dto.sectionId);
    let month = await this.prisma.pprCalendarMonth.findFirst({
      where: {
        structuralUnitId: dto.structuralUnitId,
        sectionId: monthSectionId,
        year: dto.year,
        month: dto.month,
      },
      include: this.monthWithEntriesInclude,
    });

    if (!month) {
      month = await this.findOrCreateDraftMonth({
        structuralUnitId: dto.structuralUnitId,
        sectionId: monthSectionId,
        year: dto.year,
        month: dto.month,
      });
    } else {
      this.assertMonthEditable(month.status);
    }

    const pprType = await this.prisma.pprType.findUnique({ where: { id: dto.pprTypeId } });

    if (!pprType) {
      throw new NotFoundException(ErrorCode.PPR_TYPE_NOT_FOUND);
    }

    await this.prisma.pprCalendarEntry.create({
      data: {
        monthId: month.id,
        date: dto.date,
        pprTypeId: dto.pprTypeId,
        objectIds: normalizeObjectIds(dto.objectIds) as unknown as Prisma.InputJsonValue,
        scopeType: dto.scopeType,
        sectionId: dto.scopeType === 'section' ? (dto.entrySectionId ?? '') : '',
        comment: dto.comment?.trim() ?? '',
        createdByUserId: user.id,
      },
    });

    const updatedMonth = await this.getMonthOrThrow(month.id);
    const mapped = mapPprCalendarMonthRecord(updatedMonth);
    this.emitMonthChange(mapped, month.entries.length === 0 ? 'create' : 'update');

    return mapped;
  }

  async updateEntry(id: string, dto: UpdatePprCalendarEntryDto, user: AuthenticatedUser) {
    const entry = await this.getEntryOrThrow(id);

    await this.assertUnitMemberAccess(user.id, entry.month.structuralUnitId);
    this.assertMonthEditable(entry.month.status);

    if (dto.scopeType) {
      this.validateEntryScope(dto.scopeType, dto.entrySectionId);
    }

    if (dto.pprTypeId) {
      const pprType = await this.prisma.pprType.findUnique({ where: { id: dto.pprTypeId } });

      if (!pprType) {
        throw new NotFoundException(ErrorCode.PPR_TYPE_NOT_FOUND);
      }
    }

    const nextScopeType = dto.scopeType ?? (entry.scopeType as 'section' | 'structure');
    const nextEntrySectionId =
      dto.entrySectionId !== undefined
        ? dto.entrySectionId
        : entry.sectionId ?? undefined;

    if (dto.scopeType || dto.entrySectionId !== undefined) {
      this.validateEntryScope(nextScopeType, nextEntrySectionId);
    }

    await this.prisma.pprCalendarEntry.update({
      where: { id },
      data: {
        ...(dto.pprTypeId !== undefined && { pprTypeId: dto.pprTypeId }),
        ...(dto.objectIds !== undefined && {
          objectIds: normalizeObjectIds(dto.objectIds) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.scopeType !== undefined && { scopeType: dto.scopeType }),
        ...((dto.scopeType !== undefined || dto.entrySectionId !== undefined) && {
          sectionId: nextScopeType === 'section' ? (nextEntrySectionId ?? '') : '',
        }),
        ...(dto.comment !== undefined && { comment: dto.comment.trim() }),
      },
    });

    const updatedMonth = await this.getMonthOrThrow(entry.monthId);
    const mapped = mapPprCalendarMonthRecord(updatedMonth);
    this.emitMonthChange(mapped, 'update');

    const updatedEntry = mapped.entries.find((item) => item.id === id);

    if (!updatedEntry) {
      throw new NotFoundException(ErrorCode.PPR_CALENDAR_ENTRY_NOT_FOUND);
    }

    return updatedEntry;
  }

  async removeEntry(id: string, user: AuthenticatedUser) {
    const entry = await this.getEntryOrThrow(id);

    await this.assertUnitMemberAccess(user.id, entry.month.structuralUnitId);
    this.assertMonthEditable(entry.month.status);

    await this.prisma.pprCalendarEntry.delete({ where: { id } });

    const updatedMonth = await this.getMonthOrThrow(entry.monthId);
    const mapped = mapPprCalendarMonthRecord(updatedMonth);
    this.emitMonthChange(mapped, 'update');

    return { message: 'PPR calendar entry deleted successfully' };
  }

  async submitMonth(id: string, user: AuthenticatedUser) {
    const month = await this.getMonthOrThrow(id);

    await this.assertUnitMemberAccess(user.id, month.structuralUnitId);

    if (month.status !== 'draft') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_SUBMITTABLE);
    }

    if (month.entries.length === 0) {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_EMPTY);
    }

    const unit = await this.getStructuralUnitOrThrow(month.structuralUnitId);
    const headUserId = await this.resolveHeadUserId(unit);

    if (!headUserId) {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_HEAD_NOT_FOUND);
    }

    const updated = await this.prisma.pprCalendarMonth.update({
      where: { id },
      data: {
        status: 'pending_approval',
        submittedByUserId: user.id,
        submittedAt: new Date(),
      },
      include: { entries: { orderBy: { date: 'asc' }, include: { executions: true } } },
    });

    const submitter = await this.getUserContext(user.id);
    const monthLabel = `${updated.month}/${updated.year}`;
    const linkPath = buildPprCalendarLinkPath({
      year: updated.year,
      month: updated.month,
      structuralUnitId: updated.structuralUnitId,
      sectionId: updated.sectionId,
      openApproval: true,
    });

    await this.notificationsService.create({
      userId: headUserId,
      type: NOTIFICATION_TYPES.PPR_CALENDAR_SUBMITTED,
      title: 'PPR taqvimi tasdiqlash',
      message: `${submitter.firstName} ${submitter.lastName} ${monthLabel} oyi PPR taqvimini tasdiqlashga yubordi.`,
      linkPath,
      metadata: {
        monthId: updated.id,
        year: updated.year,
        month: updated.month,
        structuralUnitId: updated.structuralUnitId,
        sectionId: updated.sectionId || undefined,
        openApproval: true,
      },
    });

    const mapped = mapPprCalendarMonthRecord(updated);
    this.emitMonthChange(mapped, 'update');

    return mapped;
  }

  async approveMonth(id: string, user: AuthenticatedUser) {
    const month = await this.getMonthOrThrow(id);

    await this.assertHeadAccess(user.id, month.structuralUnitId);

    if (month.status !== 'pending_approval') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_SUBMITTABLE);
    }

    const updated = await this.prisma.pprCalendarMonth.update({
      where: { id },
      data: {
        status: 'approved',
        approvedByUserId: user.id,
        approvedAt: new Date(),
      },
      include: { entries: { orderBy: { date: 'asc' }, include: { executions: true } } },
    });

    const monthLabel = `${updated.month}/${updated.year}`;
    const linkPath = buildPprCalendarLinkPath({
      year: updated.year,
      month: updated.month,
      sectionId: updated.sectionId,
    });

    if (month.submittedByUserId) {
      await this.notificationsService.create({
        userId: month.submittedByUserId,
        type: NOTIFICATION_TYPES.PPR_CALENDAR_APPROVED,
        title: 'PPR taqvimi tasdiqlandi',
        message: `${monthLabel} oyi PPR taqvimingiz tasdiqlandi.`,
        linkPath,
        metadata: {
          monthId: updated.id,
          year: updated.year,
          month: updated.month,
          structuralUnitId: updated.structuralUnitId,
        },
      });
    }

    const mapped = mapPprCalendarMonthRecord(updated);
    this.emitMonthChange(mapped, 'update');

    return mapped;
  }

  async rejectMonth(id: string, user: AuthenticatedUser) {
    const month = await this.getMonthOrThrow(id);

    await this.assertHeadAccess(user.id, month.structuralUnitId);

    if (month.status !== 'pending_approval') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_SUBMITTABLE);
    }

    const updated = await this.prisma.pprCalendarMonth.update({
      where: { id },
      data: {
        status: 'draft',
        submittedByUserId: null,
        submittedAt: null,
      },
      include: { entries: { orderBy: { date: 'asc' }, include: { executions: true } } },
    });

    const monthLabel = `${updated.month}/${updated.year}`;
    const linkPath = buildPprCalendarLinkPath({
      year: updated.year,
      month: updated.month,
      sectionId: updated.sectionId,
    });
    const rejectedSubmitterId = month.submittedByUserId;

    if (rejectedSubmitterId) {
      await this.notificationsService.create({
        userId: rejectedSubmitterId,
        type: NOTIFICATION_TYPES.PPR_CALENDAR_REJECTED,
        title: 'PPR taqvimi rad etildi',
        message: `${monthLabel} oyi PPR taqvimingiz qayta tahrirga qaytarildi. Xatolarni tuzating yoki oyni tozalab boshidan yozing.`,
        linkPath,
        metadata: {
          monthId: updated.id,
          year: updated.year,
          month: updated.month,
          structuralUnitId: updated.structuralUnitId,
        },
      });
    }

    const mapped = mapPprCalendarMonthRecord(updated);
    this.emitMonthChange(mapped, 'update');

    return mapped;
  }

  async clearMonth(id: string, user: AuthenticatedUser) {
    const month = await this.getMonthOrThrow(id);

    await this.assertUnitMemberAccess(user.id, month.structuralUnitId);
    this.assertMonthEditable(month.status);

    if (month.entries.length === 0) {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_ALREADY_EMPTY);
    }

    await this.prisma.pprCalendarEntry.deleteMany({
      where: { monthId: id },
    });

    const updatedMonth = await this.getMonthOrThrow(id);
    const mapped = mapPprCalendarMonthRecord(updatedMonth);
    this.emitMonthChange(mapped, 'update');

    return mapped;
  }

  async executeEntry(id: string, dto: ExecutePprCalendarEntryDto, user: AuthenticatedUser) {
    const entry = await this.getEntryOrThrow(id);

    await this.assertUnitMemberAccess(user.id, entry.month.structuralUnitId);

    if (entry.month.status !== 'approved') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_APPROVED);
    }

    if (!isPprExecutionDateAllowed(entry.date)) {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_EXECUTION_DATE_LOCKED);
    }

    const plannedObjectIds = normalizeObjectIds(entry.objectIds);
    const requestedObjectIds = normalizeObjectIds(dto.objectIds);
    const completedObjectIds = new Set(entry.executions.map((item) => item.objectId));

    const invalidObjectIds = requestedObjectIds.filter(
      (objectId) => !plannedObjectIds.includes(objectId) || completedObjectIds.has(objectId),
    );

    if (invalidObjectIds.length > 0 || requestedObjectIds.length === 0) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const images = normalizeAttachments(dto.images);
    const files = normalizeAttachments(dto.files);
    const comment = dto.comment?.trim() ?? '';

    await this.prisma.$transaction(
      requestedObjectIds.map((objectId) =>
        this.prisma.pprCalendarObjectExecution.create({
          data: {
            entryId: entry.id,
            objectId,
            images: images as unknown as Prisma.InputJsonValue,
            files: files as unknown as Prisma.InputJsonValue,
            comment,
            executedByUserId: user.id,
          },
        }),
      ),
    );

    const updatedMonth = await this.getMonthOrThrow(entry.monthId);
    const mapped = mapPprCalendarMonthRecord(updatedMonth);
    this.emitMonthChange(mapped, 'update');

    return mapped;
  }

  async getApprovedMonths(query: GetApprovedPprCalendarMonthsQueryDto, user: AuthenticatedUser) {
    await assertPprManagementAccess(this.prisma, user.id);

    const where: Prisma.PprCalendarMonthWhereInput = {
      status: 'approved',
      ...(query.structuralUnitId ? { structuralUnitId: query.structuralUnitId } : {}),
      ...(query.year !== undefined ? { year: query.year } : {}),
      ...(query.month !== undefined ? { month: query.month } : {}),
    };

    if (query.sectionId) {
      where.sectionId = query.sectionId;
    } else if (query.scopeType === 'structure') {
      where.sectionId = '';
    } else if (query.scopeType === 'section') {
      where.sectionId = { not: '' };
    }

    let months = await this.prisma.pprCalendarMonth.findMany({
      where,
      include: this.monthWithEntriesInclude,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { updatedAt: 'desc' }],
    });

    const fromPeriod =
      query.fromYear !== undefined && query.fromMonth !== undefined
        ? query.fromYear * 12 + query.fromMonth
        : null;
    const toPeriod =
      query.toYear !== undefined && query.toMonth !== undefined
        ? query.toYear * 12 + query.toMonth
        : null;

    if (fromPeriod !== null) {
      months = months.filter((month) => month.year * 12 + month.month >= fromPeriod);
    }

    if (toPeriod !== null) {
      months = months.filter((month) => month.year * 12 + month.month <= toPeriod);
    }

    return months.map((month) => mapPprCalendarMonthRecord(month));
  }

  async getApprovedMonthById(id: string, user: AuthenticatedUser) {
    await assertPprManagementAccess(this.prisma, user.id);

    const month = await this.getMonthOrThrow(id);

    if (month.status !== 'approved') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_APPROVED);
    }

    return mapPprCalendarMonthRecord(month);
  }

  async adminClearMonth(id: string, user: AuthenticatedUser) {
    await assertPprManagementDeleteAccess(this.prisma, user.id);

    const month = await this.getMonthOrThrow(id);

    if (month.status !== 'approved') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_APPROVED);
    }

    await this.prisma.pprCalendarEntry.deleteMany({
      where: { monthId: id },
    });

    const updated = await this.prisma.pprCalendarMonth.update({
      where: { id },
      data: {
        status: 'draft',
        submittedByUserId: null,
        submittedAt: null,
        approvedByUserId: null,
        approvedAt: null,
      },
      include: this.monthWithEntriesInclude,
    });

    const monthLabel = `${updated.month}/${updated.year}`;
    const linkPath = buildPprCalendarLinkPath({
      year: updated.year,
      month: updated.month,
      sectionId: updated.sectionId,
      structuralUnitId: updated.structuralUnitId,
    });

    if (month.submittedByUserId) {
      await this.notificationsService.create({
        userId: month.submittedByUserId,
        type: NOTIFICATION_TYPES.PPR_CALENDAR_REJECTED,
        title: 'PPR taqvimi tozalandi',
        message: `${monthLabel} oyi PPR taqvimi administrator tomonidan tozalandi. Jadvalni boshidan tuzishingiz mumkin.`,
        linkPath,
        metadata: {
          monthId: updated.id,
          year: updated.year,
          month: updated.month,
          structuralUnitId: updated.structuralUnitId,
        },
      });
    }

    const mapped = mapPprCalendarMonthRecord(updated);
    this.emitMonthChange(mapped, 'update');

    return mapped;
  }

  async adminRemoveEntry(id: string, user: AuthenticatedUser) {
    await assertPprManagementDeleteAccess(this.prisma, user.id);

    const entry = await this.getEntryOrThrow(id);

    if (entry.month.status !== 'approved') {
      throw new BadRequestException(ErrorCode.PPR_CALENDAR_MONTH_NOT_APPROVED);
    }

    await this.prisma.pprCalendarEntry.delete({ where: { id } });

    const updatedMonth = await this.getMonthOrThrow(entry.monthId);
    const mapped = mapPprCalendarMonthRecord(updatedMonth);
    this.emitMonthChange(mapped, 'update');

    return { message: 'PPR calendar entry deleted successfully', month: mapped };
  }
}
