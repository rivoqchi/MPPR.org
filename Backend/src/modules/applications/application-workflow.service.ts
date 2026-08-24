import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  assertPagePermission,
  PAGE_KEYS,
} from '../../common/lib/assert-page-permission';
import { AuthenticatedUser } from '../../common/types';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  buildWorkflowMessageNotifications,
  buildWorkflowStatusNotifications,
} from '../notifications/lib/application-notifications';
import {
  CreateWorkflowMessageDto,
  UpdateWorkflowStatusDto,
} from './dto/application-workflow.dto';
import {
  mapApplicationRecord,
  mapWorkflowMessageRecord,
  normalizeAttachments,
  normalizeStructuralUnitIds,
} from './lib/normalize-application';
import {
  aggregateWorkflowStatus,
  allUnitsPendingConfirmation,
  isWorkflowFinalized,
  mergeConfirmationFiles,
  normalizeWorkflowUnitStatuses,
  updateWorkflowUnitStatus,
} from './lib/workflow-unit-status';

@Injectable()
export class ApplicationWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getApplicationOrThrow(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(ErrorCode.APPLICATION_NOT_FOUND);
    }

    return application;
  }

  private async assertWorkflowAccess(applicationId: string, user: AuthenticatedUser) {
    const application = await this.getApplicationOrThrow(applicationId);
    const participant = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { structuralUnitId: true },
    });

    const structuralUnitId = participant?.structuralUnitId;

    if (!structuralUnitId) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    const recipientUnitIds = normalizeStructuralUnitIds(application.structuralUnitIds);
    const submitterUnitId = application.createdByStructuralUnitId;

    const canAccess =
      submitterUnitId === structuralUnitId || recipientUnitIds.includes(structuralUnitId);

    if (!canAccess) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    return application;
  }

  private assertWorkflowNotFinalized(workflowStatus: string) {
    if (isWorkflowFinalized(workflowStatus)) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FINALIZED);
    }
  }

  private async assertSubmitterAccess(
    application: { createdByStructuralUnitId: string | null },
    user: AuthenticatedUser,
  ) {
    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { structuralUnitId: true },
    });

    if (
      !author?.structuralUnitId ||
      author.structuralUnitId !== application.createdByStructuralUnitId
    ) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    return author;
  }

  private assertReadyForSubmitterFinalization(application: ReturnType<typeof mapApplicationRecord>) {
    if (application.workflowStatus !== 'pending_confirmation') {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_NOT_READY_FOR_FINALIZATION);
    }

    if (!allUnitsPendingConfirmation(application.workflowUnitStatuses)) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_NOT_READY_FOR_FINALIZATION);
    }
  }

  async getWorkflow(applicationId: string, user: AuthenticatedUser) {
    const application = await this.assertWorkflowAccess(applicationId, user);

    const messages = await this.prisma.applicationWorkflowMessage.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      application: mapApplicationRecord(application),
      messages: messages.map((message) => mapWorkflowMessageRecord(message)),
    };
  }

  async createMessage(
    applicationId: string,
    dto: CreateWorkflowMessageDto,
    user: AuthenticatedUser,
  ) {
    const existingApplication = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existingApplication.workflowStatus);

    const content = dto.content?.trim() ?? '';
    const attachments = normalizeAttachments(dto.attachments);

    if (!content && attachments.length === 0) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        structuralUnitId: true,
      },
    });

    const message = await this.prisma.applicationWorkflowMessage.create({
      data: {
        applicationId,
        authorUserId: user.id,
        authorFirstName: author?.firstName,
        authorLastName: author?.lastName,
        authorStructuralUnitId: author?.structuralUnitId,
        content,
        attachments: attachments as unknown as Prisma.InputJsonValue,
      },
    });

    const mapped = mapWorkflowMessageRecord(message);

    const application = await this.getApplicationOrThrow(applicationId);
    const notificationPayloads = await buildWorkflowMessageNotifications(this.prisma, {
      applicationId,
      authorUserId: user.id,
      authorFirstName: author?.firstName,
      authorLastName: author?.lastName,
      authorStructuralUnitId: author?.structuralUnitId,
      createdByStructuralUnitId: application.createdByStructuralUnitId,
      recipientUnitIds: normalizeStructuralUnitIds(application.structuralUnitIds),
      content,
    });

    if (notificationPayloads.length > 0) {
      await this.notificationsService.createMany(notificationPayloads);
    }

    this.realtimeService.emitEntityChange('application-workflow', 'create', {
      applicationId,
      message: mapped,
    });

    return mapped;
  }

  async updateStatus(
    applicationId: string,
    dto: UpdateWorkflowStatusDto,
    user: AuthenticatedUser,
  ) {
    await assertPagePermission(
      this.prisma,
      user.id,
      PAGE_KEYS.applicationsIncoming,
      'canEdit',
      ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN,
    );

    const existingApplication = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existingApplication.workflowStatus);

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        structuralUnitId: true,
      },
    });

    const recipientUnitIds = normalizeStructuralUnitIds(existingApplication.structuralUnitIds);
    const authorStructuralUnitId = author?.structuralUnitId;

    if (!authorStructuralUnitId || !recipientUnitIds.includes(authorStructuralUnitId)) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    const confirmationFiles = normalizeAttachments(dto.confirmationFiles);

    if (dto.workflowStatus === 'pending_confirmation' && confirmationFiles.length === 0) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_CONFIRMATION_FILES_REQUIRED);
    }

    const workflowUnitStatuses = updateWorkflowUnitStatus(
      recipientUnitIds,
      mapApplicationRecord(existingApplication).workflowUnitStatuses,
      authorStructuralUnitId,
      dto.workflowStatus,
      confirmationFiles,
    );
    const workflowStatus = aggregateWorkflowStatus(workflowUnitStatuses);

    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        workflowStatus,
        workflowUnitStatuses: workflowUnitStatuses as unknown as Prisma.InputJsonValue,
        confirmationFiles: mergeConfirmationFiles(workflowUnitStatuses) as unknown as Prisma.InputJsonValue,
      },
    });

    const mapped = mapApplicationRecord(application);

    const notificationPayloads = await buildWorkflowStatusNotifications(this.prisma, {
      applicationId,
      authorUserId: user.id,
      authorFirstName: author?.firstName,
      authorLastName: author?.lastName,
      authorStructuralUnitId,
      createdByStructuralUnitId: existingApplication.createdByStructuralUnitId,
      recipientUnitIds,
      workflowStatus: dto.workflowStatus,
    });

    if (notificationPayloads.length > 0) {
      await this.notificationsService.createMany(notificationPayloads);
    }

    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return mapped;
  }

  async confirmWorkflow(applicationId: string, user: AuthenticatedUser) {
    const existingApplication = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existingApplication.workflowStatus);
    await this.assertSubmitterAccess(existingApplication, user);

    const mappedExisting = mapApplicationRecord(existingApplication);
    this.assertReadyForSubmitterFinalization(mappedExisting);

    const confirmedUnitStatuses = normalizeWorkflowUnitStatuses(
      existingApplication.workflowUnitStatuses,
    ).map((unit) => ({
      ...unit,
      workflowStatus: 'confirmed' as const,
    }));

    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        workflowStatus: 'confirmed',
        status: 'completed',
        workflowUnitStatuses: confirmedUnitStatuses as unknown as Prisma.InputJsonValue,
        confirmationFiles: mergeConfirmationFiles(confirmedUnitStatuses) as unknown as Prisma.InputJsonValue,
      },
    });

    const mapped = mapApplicationRecord(application);
    const recipientUnitIds = normalizeStructuralUnitIds(existingApplication.structuralUnitIds);

    const notificationPayloads = await buildWorkflowStatusNotifications(this.prisma, {
      applicationId,
      authorUserId: user.id,
      authorFirstName: mappedExisting.createdByFirstName,
      authorLastName: mappedExisting.createdByLastName,
      authorStructuralUnitId: existingApplication.createdByStructuralUnitId,
      createdByStructuralUnitId: existingApplication.createdByStructuralUnitId,
      recipientUnitIds,
      workflowStatus: 'confirmed',
    });

    if (notificationPayloads.length > 0) {
      await this.notificationsService.createMany(notificationPayloads);
    }

    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return mapped;
  }

  async cancelWorkflow(applicationId: string, user: AuthenticatedUser) {
    const existingApplication = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existingApplication.workflowStatus);
    await this.assertSubmitterAccess(existingApplication, user);

    const mappedExisting = mapApplicationRecord(existingApplication);
    this.assertReadyForSubmitterFinalization(mappedExisting);

    const cancelledUnitStatuses = normalizeWorkflowUnitStatuses(
      existingApplication.workflowUnitStatuses,
    ).map((unit) => ({
      ...unit,
      workflowStatus: 'cancelled' as const,
    }));

    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        workflowStatus: 'cancelled',
        status: 'cancelled',
        workflowUnitStatuses: cancelledUnitStatuses as unknown as Prisma.InputJsonValue,
        confirmationFiles: mergeConfirmationFiles(cancelledUnitStatuses) as unknown as Prisma.InputJsonValue,
      },
    });

    const mapped = mapApplicationRecord(application);
    const recipientUnitIds = normalizeStructuralUnitIds(existingApplication.structuralUnitIds);

    const notificationPayloads = await buildWorkflowStatusNotifications(this.prisma, {
      applicationId,
      authorUserId: user.id,
      authorFirstName: mappedExisting.createdByFirstName,
      authorLastName: mappedExisting.createdByLastName,
      authorStructuralUnitId: existingApplication.createdByStructuralUnitId,
      createdByStructuralUnitId: existingApplication.createdByStructuralUnitId,
      recipientUnitIds,
      workflowStatus: 'cancelled',
    });

    if (notificationPayloads.length > 0) {
      await this.notificationsService.createMany(notificationPayloads);
    }

    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return mapped;
  }
}
