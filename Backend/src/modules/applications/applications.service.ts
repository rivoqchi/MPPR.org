import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildApplicationCreatedNotifications } from '../notifications/lib/application-notifications';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import {
  mapApplicationRecord,
  normalizeAttachments,
  normalizeSpecialMessages,
  normalizeStructuralUnitIds,
} from './lib/normalize-application';
import {
  aggregateWorkflowStatus,
  isApplicationFinalized,
  mergeConfirmationFiles,
  normalizeWorkflowUnitStatuses,
  syncWorkflowUnitStatuses,
  updateWorkflowUnitStatus,
} from './lib/workflow-unit-status';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.application
      .findMany({
        orderBy: { createdAt: 'desc' },
      })
      .then((applications) => applications.map((application) => mapApplicationRecord(application)));
  }

  async findOne(id: string) {
    const application = await this.prisma.application.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundException(ErrorCode.APPLICATION_NOT_FOUND);
    }

    return mapApplicationRecord(application);
  }

  async create(dto: CreateApplicationDto, createdByUserId: string) {
    const creator = await this.prisma.user.findUnique({
      where: { id: createdByUserId },
      select: {
        firstName: true,
        lastName: true,
        structuralUnitId: true,
      },
    });

    const structuralUnitIds = normalizeStructuralUnitIds(dto.structuralUnitIds);
    const workflowUnitStatuses = syncWorkflowUnitStatuses(structuralUnitIds, []);
    const workflowStatus = aggregateWorkflowStatus(workflowUnitStatuses);

    const application = await this.prisma.application.create({
      data: {
        structuralUnitIds: structuralUnitIds as unknown as Prisma.InputJsonValue,
        type: dto.type,
        status: 'in_progress',
        workflowStatus,
        workflowUnitStatuses: workflowUnitStatuses as unknown as Prisma.InputJsonValue,
        confirmationFiles: mergeConfirmationFiles(workflowUnitStatuses) as unknown as Prisma.InputJsonValue,
        deadline: dto.deadline,
        images: normalizeAttachments(dto.images) as unknown as Prisma.InputJsonValue,
        files: normalizeAttachments(dto.files) as unknown as Prisma.InputJsonValue,
        comment: dto.comment.trim(),
        specialMessages: normalizeSpecialMessages(
          dto.specialMessages,
        ) as unknown as Prisma.InputJsonValue,
        createdByUserId,
        createdByFirstName: creator?.firstName,
        createdByLastName: creator?.lastName,
        createdByStructuralUnitId: creator?.structuralUnitId,
      },
    });

    const mapped = mapApplicationRecord(application);

    const recipientUnitIds = normalizeStructuralUnitIds(application.structuralUnitIds);
    const notificationPayloads = await buildApplicationCreatedNotifications(this.prisma, {
      applicationId: application.id,
      applicationType: application.type,
      deadline: application.deadline,
      creatorUserId: createdByUserId,
      creatorFirstName: creator?.firstName,
      creatorLastName: creator?.lastName,
      recipientUnitIds,
    });

    if (notificationPayloads.length > 0) {
      await this.notificationsService.createMany(notificationPayloads);
    }

    this.realtimeService.emitEntityChange('applications', 'create', mapped);

    return mapped;
  }

  async update(id: string, dto: UpdateApplicationDto) {
    const existing = await this.prisma.application.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(ErrorCode.APPLICATION_NOT_FOUND);
    }

    if (isApplicationFinalized(existing)) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FINALIZED);
    }

    const nextStructuralUnitIds =
      dto.structuralUnitIds !== undefined
        ? normalizeStructuralUnitIds(dto.structuralUnitIds)
        : normalizeStructuralUnitIds(existing.structuralUnitIds);
    const existingUnitStatuses = normalizeWorkflowUnitStatuses(existing.workflowUnitStatuses);
    const nextWorkflowUnitStatuses =
      dto.structuralUnitIds !== undefined
        ? syncWorkflowUnitStatuses(nextStructuralUnitIds, existingUnitStatuses)
        : undefined;
    const nextWorkflowStatus =
      nextWorkflowUnitStatuses !== undefined
        ? aggregateWorkflowStatus(nextWorkflowUnitStatuses)
        : undefined;

    const application = await this.prisma.application.update({
      where: { id },
      data: {
        ...(dto.structuralUnitIds !== undefined && {
          structuralUnitIds: nextStructuralUnitIds as unknown as Prisma.InputJsonValue,
          workflowUnitStatuses: nextWorkflowUnitStatuses as unknown as Prisma.InputJsonValue,
          workflowStatus: nextWorkflowStatus,
          confirmationFiles: mergeConfirmationFiles(
            nextWorkflowUnitStatuses ?? [],
          ) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline }),
        ...(dto.images !== undefined && {
          images: normalizeAttachments(dto.images) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.files !== undefined && {
          files: normalizeAttachments(dto.files) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.comment !== undefined && { comment: dto.comment.trim() }),
        ...(dto.specialMessages !== undefined && {
          specialMessages: normalizeSpecialMessages(
            dto.specialMessages,
          ) as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    const mapped = mapApplicationRecord(application);

    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return mapped;
  }

  async remove(id: string) {
    const existing = await this.prisma.application.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(ErrorCode.APPLICATION_NOT_FOUND);
    }

    if (isApplicationFinalized(existing)) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FINALIZED);
    }

    const application = mapApplicationRecord(existing);

    await this.prisma.application.delete({ where: { id } });

    this.realtimeService.emitEntityChange('applications', 'delete', application);

    return { message: 'Application deleted successfully' };
  }
}
