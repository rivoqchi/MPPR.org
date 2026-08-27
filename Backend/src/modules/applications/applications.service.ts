import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  assertPagePermission,
  PAGE_KEYS,
} from '../../common/lib/assert-page-permission';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildApplicationCreatedNotifications } from '../notifications/lib/application-notifications';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import {
  mapApplicationRecord,
  normalizeAttachments,
  normalizeRecipientUserIds,
  normalizeSpecialMessages,
  normalizeStructuralUnitIds,
  normalizeSubmissionMode,
} from './lib/normalize-application';
import {
  generateApplicationNumber,
  normalizeManualApplicationNumber,
} from './lib/application-number';
import {
  aggregateWorkflowStatus,
  isApplicationFinalized,
  mergeConfirmationFiles,
  normalizeWorkflowUnitStatuses,
  syncWorkflowUnitStatuses,
} from './lib/workflow-unit-status';
import { createInitialWorkflowAssignments } from './lib/workflow-assignments';

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

  private assertDoesNotTargetSelf(
    recipientUserIds: string[],
    actorUserId: string | null | undefined,
  ) {
    if (actorUserId && recipientUserIds.includes(actorUserId)) {
      throw new BadRequestException(ErrorCode.APPLICATION_CANNOT_TARGET_SELF);
    }
  }

  private async assertApplicationNumberAvailable(
    applicationNumber: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.application.findFirst({
      where: {
        applicationNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(ErrorCode.APPLICATION_NUMBER_ALREADY_EXISTS);
    }
  }

  private async resolveApplicationNumber(params: {
    numberMode?: 'auto' | 'manual';
    applicationNumber?: string | null;
    creatorStructuralUnitId?: string | null;
    fallbackNumber?: string | null;
    excludeId?: string;
  }): Promise<string> {
    const mode = params.numberMode ?? (params.applicationNumber ? 'manual' : 'auto');

    if (mode === 'manual') {
      const manualNumber = normalizeManualApplicationNumber(params.applicationNumber);

      if (!manualNumber || manualNumber.length < 3) {
        throw new BadRequestException(ErrorCode.APPLICATION_NUMBER_REQUIRED);
      }

      await this.assertApplicationNumberAvailable(manualNumber, params.excludeId);
      return manualNumber;
    }

    if (params.fallbackNumber) {
      return params.fallbackNumber;
    }

    const unit = params.creatorStructuralUnitId
      ? await this.prisma.structuralUnit.findUnique({
          where: { id: params.creatorStructuralUnitId },
          select: { shortName: true },
        })
      : null;

    const generated = await generateApplicationNumber(
      this.prisma,
      unit?.shortName ?? 'APP',
    );
    await this.assertApplicationNumberAvailable(generated, params.excludeId);
    return generated;
  }

  private async normalizeTargeting(
    dto: {
      submissionMode?: 'single' | 'combined';
      recipientUserIds?: string[];
      structuralUnitIds?: string[];
      structuralUnitSectionId?: string | null;
    },
    fallback?: {
      submissionMode: string | null;
      recipientUserIds?: unknown;
      structuralUnitIds: unknown;
      structuralUnitSectionId: string | null;
    },
  ) {
    const recipientUserIds = normalizeRecipientUserIds(
      dto.recipientUserIds ?? fallback?.recipientUserIds,
    );

    if (recipientUserIds.length === 0) {
      throw new BadRequestException(ErrorCode.APPLICATION_RECIPIENTS_REQUIRED);
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: recipientUserIds },
        isActive: true,
      },
      select: {
        id: true,
        structuralUnitId: true,
      },
    });

    if (users.length !== recipientUserIds.length) {
      throw new BadRequestException(ErrorCode.APPLICATION_RECIPIENTS_INVALID);
    }

    const structuralUnitIds = [
      ...new Set(
        users
          .map((user) => user.structuralUnitId)
          .filter((unitId): unitId is string => Boolean(unitId)),
      ),
    ];

    if (structuralUnitIds.length === 0) {
      throw new BadRequestException(ErrorCode.APPLICATION_RECIPIENTS_INVALID);
    }

    const submissionMode =
      dto.submissionMode ??
      (recipientUserIds.length === 1 ? 'single' : 'combined');

    return {
      submissionMode: normalizeSubmissionMode(submissionMode),
      recipientUserIds,
      structuralUnitIds,
      structuralUnitSectionId: null as string | null,
    };
  }

  async create(dto: CreateApplicationDto, createdByUserId: string) {
    await assertPagePermission(
      this.prisma,
      createdByUserId,
      PAGE_KEYS.applicationsSubmit,
      'canCreate',
    );

    const creator = await this.prisma.user.findUnique({
      where: { id: createdByUserId },
      select: {
        firstName: true,
        lastName: true,
        structuralUnitId: true,
      },
    });

    const targeting = await this.normalizeTargeting(dto);
    this.assertDoesNotTargetSelf(targeting.recipientUserIds, createdByUserId);

    const applicationNumber = await this.resolveApplicationNumber({
      numberMode: dto.numberMode,
      applicationNumber: dto.applicationNumber,
      creatorStructuralUnitId: creator?.structuralUnitId,
    });

    const workflowUnitStatuses = syncWorkflowUnitStatuses(targeting.structuralUnitIds, []);
    const workflowStatus = aggregateWorkflowStatus(workflowUnitStatuses);
    const workflowAssignments = createInitialWorkflowAssignments(
      targeting.recipientUserIds,
      createdByUserId,
    );

    const application = await this.prisma.application.create({
      data: {
        applicationNumber,
        submissionMode: targeting.submissionMode,
        recipientUserIds: targeting.recipientUserIds as unknown as Prisma.InputJsonValue,
        structuralUnitIds: targeting.structuralUnitIds as unknown as Prisma.InputJsonValue,
        structuralUnitSectionId: targeting.structuralUnitSectionId,
        type: dto.type,
        status: 'in_progress',
        workflowStatus,
        workflowUnitStatuses: workflowUnitStatuses as unknown as Prisma.InputJsonValue,
        workflowAssignments: workflowAssignments as unknown as Prisma.InputJsonValue,
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

    const notificationPayloads = await buildApplicationCreatedNotifications(this.prisma, {
      applicationId: application.id,
      applicationType: application.type,
      deadline: application.deadline,
      creatorUserId: createdByUserId,
      creatorFirstName: creator?.firstName,
      creatorLastName: creator?.lastName,
      submissionMode: targeting.submissionMode,
      recipientUnitIds: targeting.structuralUnitIds,
      recipientUserIds: targeting.recipientUserIds,
      structuralUnitSectionId: targeting.structuralUnitSectionId,
    });

    if (notificationPayloads.length > 0) {
      await this.notificationsService.createMany(notificationPayloads);
    }

    this.realtimeService.emitEntityChange('applications', 'create', mapped);

    return mapped;
  }

  async update(id: string, dto: UpdateApplicationDto, actorId: string) {
    await assertPagePermission(
      this.prisma,
      actorId,
      PAGE_KEYS.applicationsSubmit,
      'canEdit',
    );

    const existing = await this.prisma.application.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(ErrorCode.APPLICATION_NOT_FOUND);
    }

    if (isApplicationFinalized(existing)) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FINALIZED);
    }

    const targetingChanged =
      dto.recipientUserIds !== undefined ||
      dto.submissionMode !== undefined ||
      dto.structuralUnitIds !== undefined ||
      dto.structuralUnitSectionId !== undefined;

    const targeting = targetingChanged
      ? await this.normalizeTargeting(dto, {
          submissionMode: existing.submissionMode,
          recipientUserIds: existing.recipientUserIds,
          structuralUnitIds: existing.structuralUnitIds,
          structuralUnitSectionId: existing.structuralUnitSectionId,
        })
      : {
          submissionMode: normalizeSubmissionMode(existing.submissionMode),
          recipientUserIds: normalizeRecipientUserIds(existing.recipientUserIds),
          structuralUnitIds: normalizeStructuralUnitIds(existing.structuralUnitIds),
          structuralUnitSectionId: existing.structuralUnitSectionId,
        };

    if (targetingChanged) {
      this.assertDoesNotTargetSelf(targeting.recipientUserIds, actorId);
      this.assertDoesNotTargetSelf(
        targeting.recipientUserIds,
        existing.createdByUserId,
      );
    }

    const numberChanged =
      dto.numberMode !== undefined || dto.applicationNumber !== undefined;
    let nextApplicationNumber: string | undefined;

    if (numberChanged) {
      const creatorUnitId =
        existing.createdByStructuralUnitId ??
        (
          await this.prisma.user.findUnique({
            where: { id: existing.createdByUserId },
            select: { structuralUnitId: true },
          })
        )?.structuralUnitId ??
        null;

      nextApplicationNumber = await this.resolveApplicationNumber({
        numberMode: dto.numberMode,
        applicationNumber: dto.applicationNumber,
        creatorStructuralUnitId: creatorUnitId,
        fallbackNumber: existing.applicationNumber,
        excludeId: existing.id,
      });
    }

    const existingUnitStatuses = normalizeWorkflowUnitStatuses(existing.workflowUnitStatuses);
    const nextWorkflowUnitStatuses = targetingChanged
      ? syncWorkflowUnitStatuses(targeting.structuralUnitIds, existingUnitStatuses)
      : undefined;
    const nextWorkflowStatus =
      nextWorkflowUnitStatuses !== undefined
        ? aggregateWorkflowStatus(nextWorkflowUnitStatuses)
        : undefined;
    const nextWorkflowAssignments = targetingChanged
      ? createInitialWorkflowAssignments(targeting.recipientUserIds, existing.createdByUserId)
      : undefined;

    const application = await this.prisma.application.update({
      where: { id },
      data: {
        ...(nextApplicationNumber !== undefined && {
          applicationNumber: nextApplicationNumber,
        }),
        ...(targetingChanged && {
          submissionMode: targeting.submissionMode,
          recipientUserIds: targeting.recipientUserIds as unknown as Prisma.InputJsonValue,
          structuralUnitIds: targeting.structuralUnitIds as unknown as Prisma.InputJsonValue,
          structuralUnitSectionId: targeting.structuralUnitSectionId,
          workflowUnitStatuses: nextWorkflowUnitStatuses as unknown as Prisma.InputJsonValue,
          workflowAssignments: nextWorkflowAssignments as unknown as Prisma.InputJsonValue,
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

  async remove(id: string, actorId: string) {
    await assertPagePermission(
      this.prisma,
      actorId,
      PAGE_KEYS.applicationsSubmit,
      'canDelete',
    );

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
