import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  assertPagePermission,
  PAGE_KEYS,
} from '../../common/lib/assert-page-permission';
import { AuthenticatedUser } from '../../common/types';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNotificationDto } from '../notifications/dto/notification.dto';
import { NOTIFICATION_TYPES } from '../notifications/lib/notification-types';
import {
  CreateWorkflowMessageDto,
  ForwardWorkflowDto,
  ReleaseWorkflowDto,
  UpdateWorkflowMessageDto,
  UpdateWorkflowStatusDto,
} from './dto/application-workflow.dto';
import {
  mapApplicationRecord,
  mapWorkflowMessageRecord,
  normalizeAttachments,
  normalizeRecipientUserIds,
  normalizeStructuralUnitIds,
} from './lib/normalize-application';
import {
  allRootAssignmentsReleased,
  createInitialWorkflowAssignments,
  findUserAssignment,
  isUserInWorkflowChain,
  normalizeWorkflowAssignments,
  replaceAssignment,
  type WorkflowAssignment,
} from './lib/workflow-assignments';
import {
  aggregateWorkflowStatus,
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
      select: {
        structuralUnitId: true,
        appRole: {
          select: {
            isSystem: true,
            canViewAllStructuralUnits: true,
          },
        },
      },
    });

    const canViewAll = Boolean(
      participant?.appRole?.isSystem || participant?.appRole?.canViewAllStructuralUnits,
    );

    if (canViewAll) {
      return application;
    }

    const assignments = normalizeWorkflowAssignments(application.workflowAssignments);

    if (application.createdByUserId === user.id || isUserInWorkflowChain(assignments, user.id)) {
      return application;
    }

    const recipientUserIds = normalizeRecipientUserIds(application.recipientUserIds);

    if (recipientUserIds.includes(user.id)) {
      return application;
    }

    const structuralUnitId = participant?.structuralUnitId;

    if (
      structuralUnitId &&
      recipientUserIds.length === 0 &&
      normalizeStructuralUnitIds(application.structuralUnitIds).includes(structuralUnitId)
    ) {
      return application;
    }

    if (
      structuralUnitId &&
      application.createdByStructuralUnitId === structuralUnitId
    ) {
      return application;
    }

    throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
  }

  private assertWorkflowNotFinalized(workflowStatus: string) {
    if (isWorkflowFinalized(workflowStatus)) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FINALIZED);
    }
  }

  private async saveAssignments(
    applicationId: string,
    assignments: WorkflowAssignment[],
    extra?: {
      workflowStatus?: string;
      status?: string;
    },
  ) {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        workflowAssignments: assignments as unknown as Prisma.InputJsonValue,
        ...(extra?.workflowStatus !== undefined && { workflowStatus: extra.workflowStatus }),
        ...(extra?.status !== undefined && { status: extra.status }),
      },
    });
  }

  private buildLinkPath(applicationId: string, forIncoming: boolean) {
    const base = forIncoming ? '/applications/incoming' : '/applications/submit';
    return `${base}?applicationId=${applicationId}`;
  }

  private async notifyUsers(
    payloads: CreateNotificationDto[],
  ) {
    if (payloads.length === 0) {
      return;
    }

    await this.notificationsService.createMany(payloads);
  }

  async getWorkflow(applicationId: string, user: AuthenticatedUser) {
    let application = await this.assertWorkflowAccess(applicationId, user);
    let assignments = normalizeWorkflowAssignments(application.workflowAssignments);
    const recipientUserIds = normalizeRecipientUserIds(application.recipientUserIds);

    if (assignments.length === 0 && recipientUserIds.length > 0) {
      assignments = createInitialWorkflowAssignments(
        recipientUserIds,
        application.createdByUserId,
      );
      application = await this.saveAssignments(applicationId, assignments);
    }

    const messages = await this.prisma.applicationWorkflowMessage.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      application: mapApplicationRecord(application),
      messages: messages.map((message) => mapWorkflowMessageRecord(message)),
    };
  }

  async acceptAssignment(applicationId: string, user: AuthenticatedUser) {
    const existing = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existing.workflowStatus);

    const assignments = normalizeWorkflowAssignments(existing.workflowAssignments);
    const assignment = findUserAssignment(assignments, user.id);

    if (!assignment) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_ASSIGNMENT_NOT_FOUND);
    }

    if (assignment.status !== 'pending_accept') {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_ALREADY_ACCEPTED);
    }

    const nextAssignments = replaceAssignment(assignments, {
      ...assignment,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    const application = await this.saveAssignments(applicationId, nextAssignments);
    const mapped = mapApplicationRecord(application);
    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return { application: mapped };
  }

  async forwardAssignment(
    applicationId: string,
    dto: ForwardWorkflowDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existing.workflowStatus);

    if (dto.toUserId === user.id || dto.toUserId === existing.createdByUserId) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FORWARD_INVALID);
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
      select: { id: true, isActive: true, firstName: true, lastName: true },
    });

    if (!target?.isActive) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FORWARD_INVALID);
    }

    const assignments = normalizeWorkflowAssignments(existing.workflowAssignments);
    const assignment = findUserAssignment(assignments, user.id);

    if (!assignment || (assignment.status !== 'accepted' && assignment.status !== 'replied')) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_ACCEPT_REQUIRED);
    }

    const alreadyAssigned = assignments.some(
      (item) => item.userId === dto.toUserId && item.status !== 'released',
    );

    if (alreadyAssigned) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FORWARD_INVALID);
    }

    const child: WorkflowAssignment = {
      id: randomUUID(),
      userId: dto.toUserId,
      assignedByUserId: user.id,
      parentAssignmentId: assignment.id,
      status: 'pending_accept',
      replyMessageId: null,
      forwardedToAssignmentId: null,
      acceptedAt: null,
      repliedAt: null,
      releasedAt: null,
      createdAt: new Date().toISOString(),
    };

    const nextAssignments = [
      ...replaceAssignment(assignments, {
        ...assignment,
        status: 'forwarded',
        forwardedToAssignmentId: child.id,
      }),
      child,
    ];

    const application = await this.saveAssignments(applicationId, nextAssignments);
    const mapped = mapApplicationRecord(application);

    await this.notifyUsers([
      {
        userId: dto.toUserId,
        type: NOTIFICATION_TYPES.APPLICATION_CREATED,
        title: 'Yangi ariza yo‘naltirildi',
        message: 'Sizga ariza yo‘naltirildi. Avval qabul qiling.',
        linkPath: this.buildLinkPath(applicationId, true),
        metadata: { applicationId },
      },
    ]);

    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return { application: mapped };
  }

  async replyAssignment(
    applicationId: string,
    dto: CreateWorkflowMessageDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existing.workflowStatus);

    const assignments = normalizeWorkflowAssignments(existing.workflowAssignments);
    const assignment = findUserAssignment(assignments, user.id);

    if (!assignment) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_ASSIGNMENT_NOT_FOUND);
    }

    if (assignment.status === 'pending_accept') {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_ACCEPT_REQUIRED);
    }

    if (assignment.status === 'replied' || assignment.replyMessageId) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_ALREADY_REPLIED);
    }

    if (assignment.status === 'forwarded') {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_FORWARD_INVALID);
    }

    const content = dto.content?.trim() ?? '';
    const attachments = normalizeAttachments(dto.attachments);

    if (!content && attachments.length === 0) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, structuralUnitId: true },
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
        assignmentId: assignment.id,
      },
    });

    const nextAssignments = replaceAssignment(assignments, {
      ...assignment,
      status: 'replied',
      replyMessageId: message.id,
      repliedAt: new Date().toISOString(),
    });

    const application = await this.saveAssignments(applicationId, nextAssignments);
    const mapped = mapApplicationRecord(application);
    const mappedMessage = mapWorkflowMessageRecord(message);

    const notifyUserId = assignment.assignedByUserId;
    const forIncoming = notifyUserId !== existing.createdByUserId;

    await this.notifyUsers([
      {
        userId: notifyUserId,
        type: NOTIFICATION_TYPES.APPLICATION_WORKFLOW_MESSAGE,
        title: 'Arizaga javob keldi',
        message: content || 'Fayl/rasm bilan javob yuborildi',
        linkPath: this.buildLinkPath(applicationId, forIncoming),
        metadata: { applicationId, messageId: message.id },
      },
    ]);

    this.realtimeService.emitEntityChange('applications', 'update', mapped);
    this.realtimeService.emitEntityChange('application-workflow', 'create', {
      ...mappedMessage,
      applicationId,
    });

    return {
      application: mapped,
      message: mappedMessage,
    };
  }

  async updateReplyMessage(
    applicationId: string,
    messageId: string,
    dto: UpdateWorkflowMessageDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existing.workflowStatus);

    const assignments = normalizeWorkflowAssignments(existing.workflowAssignments);
    const assignment = findUserAssignment(assignments, user.id);

    if (!assignment?.replyMessageId || assignment.replyMessageId !== messageId) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    const content = dto.content?.trim() ?? '';
    const attachments =
      dto.attachments !== undefined ? normalizeAttachments(dto.attachments) : undefined;

    if (dto.content !== undefined && !content && (attachments?.length ?? 1) === 0) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const message = await this.prisma.applicationWorkflowMessage.update({
      where: { id: messageId },
      data: {
        ...(dto.content !== undefined && { content }),
        ...(attachments !== undefined && {
          attachments: attachments as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    const mappedMessage = mapWorkflowMessageRecord(message);
    this.realtimeService.emitEntityChange('application-workflow', 'update', {
      ...mappedMessage,
      applicationId,
    });

    return mappedMessage;
  }

  async releaseSupervision(
    applicationId: string,
    dto: ReleaseWorkflowDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existing.workflowStatus);

    let assignments = normalizeWorkflowAssignments(existing.workflowAssignments);
    const isSubmitter = existing.createdByUserId === user.id;

    if (dto.assignmentId) {
      const target = assignments.find((item) => item.id === dto.assignmentId);

      if (!target || target.assignedByUserId !== user.id) {
        throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_RELEASE_NOT_ALLOWED);
      }

      if (target.status !== 'replied' && target.status !== 'forwarded') {
        throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_RELEASE_NOT_ALLOWED);
      }

      assignments = replaceAssignment(assignments, {
        ...target,
        status: 'released',
        releasedAt: new Date().toISOString(),
      });

      if (target.parentAssignmentId) {
        const parent = assignments.find((item) => item.id === target.parentAssignmentId);

        if (parent && parent.status === 'forwarded' && parent.userId === user.id) {
          assignments = replaceAssignment(assignments, {
            ...parent,
            status: 'accepted',
            forwardedToAssignmentId: parent.forwardedToAssignmentId,
          });
        }
      }
    } else if (isSubmitter) {
      const releasable = assignments.filter(
        (item) =>
          item.assignedByUserId === user.id &&
          (item.status === 'replied' || item.status === 'forwarded'),
      );

      if (releasable.length === 0) {
        throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_RELEASE_NOT_ALLOWED);
      }

      for (const item of releasable) {
        assignments = replaceAssignment(assignments, {
          ...item,
          status: 'released',
          releasedAt: new Date().toISOString(),
        });
      }
    } else {
      const child = assignments.find(
        (item) =>
          item.assignedByUserId === user.id &&
          (item.status === 'replied' || item.status === 'forwarded'),
      );

      if (!child) {
        throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_RELEASE_NOT_ALLOWED);
      }

      assignments = replaceAssignment(assignments, {
        ...child,
        status: 'released',
        releasedAt: new Date().toISOString(),
      });

      if (child.parentAssignmentId) {
        const parent = assignments.find((item) => item.id === child.parentAssignmentId);

        if (parent && parent.status === 'forwarded' && parent.userId === user.id) {
          assignments = replaceAssignment(assignments, {
            ...parent,
            status: 'accepted',
          });
        }
      }
    }

    const shouldFinalize = isSubmitter && allRootAssignmentsReleased(assignments);

    const application = await this.saveAssignments(applicationId, assignments, {
      ...(shouldFinalize && {
        workflowStatus: 'confirmed',
        status: 'completed',
      }),
    });

    const mapped = mapApplicationRecord(application);

    if (shouldFinalize) {
      await this.notifyUsers(
        normalizeRecipientUserIds(existing.recipientUserIds).map((userId) => ({
          userId,
          type: NOTIFICATION_TYPES.APPLICATION_WORKFLOW_STATUS,
          title: 'Ariza tasdiqlandi',
          message: 'Ariza nazoratdan yechildi va yopildi.',
          linkPath: this.buildLinkPath(applicationId, true),
          metadata: { applicationId },
        })),
      );
    }

    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return { application: mapped };
  }

  async createMessage(
    applicationId: string,
    dto: CreateWorkflowMessageDto,
    user: AuthenticatedUser,
  ) {
    return this.replyAssignment(applicationId, dto, user).then((result) => result.message);
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
    );

    const existingApplication = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existingApplication.workflowStatus);

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { structuralUnitId: true, firstName: true, lastName: true },
    });

    if (!author?.structuralUnitId) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    const unitIds = normalizeStructuralUnitIds(existingApplication.structuralUnitIds);

    if (!unitIds.includes(author.structuralUnitId)) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    if (
      dto.workflowStatus === 'pending_confirmation' &&
      normalizeAttachments(dto.confirmationFiles).length === 0
    ) {
      throw new BadRequestException(ErrorCode.APPLICATION_WORKFLOW_CONFIRMATION_FILES_REQUIRED);
    }

    const existingUnitStatuses = normalizeWorkflowUnitStatuses(
      existingApplication.workflowUnitStatuses,
    );
    const nextUnitStatuses = updateWorkflowUnitStatus(
      unitIds,
      existingUnitStatuses,
      author.structuralUnitId,
      dto.workflowStatus,
      normalizeAttachments(dto.confirmationFiles),
    );
    const nextWorkflowStatus = aggregateWorkflowStatus(nextUnitStatuses);

    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        workflowUnitStatuses: nextUnitStatuses as unknown as Prisma.InputJsonValue,
        workflowStatus: nextWorkflowStatus,
        confirmationFiles: mergeConfirmationFiles(nextUnitStatuses) as unknown as Prisma.InputJsonValue,
      },
    });

    const mapped = mapApplicationRecord(application);
    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return mapped;
  }

  async confirmWorkflow(applicationId: string, user: AuthenticatedUser) {
    return this.releaseSupervision(applicationId, {}, user).then(
      (result) => result.application,
    );
  }

  async cancelWorkflow(applicationId: string, user: AuthenticatedUser) {
    const existing = await this.assertWorkflowAccess(applicationId, user);
    this.assertWorkflowNotFinalized(existing.workflowStatus);

    if (existing.createdByUserId !== user.id) {
      throw new ForbiddenException(ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN);
    }

    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        workflowStatus: 'cancelled',
        status: 'cancelled',
      },
    });

    const mapped = mapApplicationRecord(application);
    this.realtimeService.emitEntityChange('applications', 'update', mapped);

    return mapped;
  }
}
