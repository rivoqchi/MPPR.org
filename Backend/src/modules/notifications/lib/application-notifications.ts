import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateNotificationDto } from '../dto/notification.dto';
import { findUsersByStructuralUnitIds } from './notification-recipients';
import { NOTIFICATION_TYPES } from './notification-types';
import { resolveApplicationIncomingRecipientUserIds } from '../../applications/lib/resolve-application-recipients';

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  returned: 'Qaytarildi',
  in_progress_work: 'Ish jarayonida',
  pending_confirmation: 'Tasdiqlash kutilmoqda',
  confirmed: 'Tasdiqlandi',
  cancelled: 'Bekor qilindi',
};

function truncateText(value: string, maxLength = 80): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function buildWorkflowLinkPath(applicationId: string, forIncoming: boolean): string {
  const base = forIncoming ? '/applications/incoming' : '/applications/submit';
  return `${base}?applicationId=${applicationId}`;
}

function getOppositeUnitIds(
  authorStructuralUnitId: string | null | undefined,
  createdByStructuralUnitId: string | null | undefined,
  recipientUnitIds: string[],
): { incomingRecipients: string[]; submitRecipients: string[] } {
  if (!authorStructuralUnitId) {
    return { incomingRecipients: [], submitRecipients: [] };
  }

  if (authorStructuralUnitId === createdByStructuralUnitId) {
    return {
      incomingRecipients: recipientUnitIds,
      submitRecipients: [],
    };
  }

  if (recipientUnitIds.includes(authorStructuralUnitId)) {
    return {
      incomingRecipients: [],
      submitRecipients: createdByStructuralUnitId ? [createdByStructuralUnitId] : [],
    };
  }

  return { incomingRecipients: [], submitRecipients: [] };
}

export async function buildApplicationCreatedNotifications(
  prisma: PrismaService,
  params: {
    applicationId: string;
    applicationType: string;
    deadline?: string | Date | null;
    creatorUserId: string;
    creatorFirstName?: string | null;
    creatorLastName?: string | null;
    submissionMode?: string | null;
    recipientUnitIds: string[];
    recipientUserIds?: string[];
    structuralUnitSectionId?: string | null;
  },
): Promise<CreateNotificationDto[]> {
  const recipientUserIds = await resolveApplicationIncomingRecipientUserIds(
    prisma,
    {
      recipientUserIds: params.recipientUserIds,
      submissionMode: params.submissionMode,
      structuralUnitIds: params.recipientUnitIds,
      structuralUnitSectionId: params.structuralUnitSectionId,
    },
    [params.creatorUserId],
  );

  const creatorName = [params.creatorFirstName, params.creatorLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const deadlineLabel = params.deadline
    ? new Date(params.deadline).toLocaleDateString('uz-UZ')
    : null;
  const message = deadlineLabel
    ? `${creatorName || 'Foydalanuvchi'} "${params.applicationType}" turidagi dastur yubordi. Muddati: ${deadlineLabel}`
    : `${creatorName || 'Foydalanuvchi'} "${params.applicationType}" turidagi dastur yubordi.`;

  return recipientUserIds.map((userId) => ({
    userId,
    type: NOTIFICATION_TYPES.APPLICATION_CREATED,
    title: 'Yangi dastur keldi',
    message,
    linkPath: buildWorkflowLinkPath(params.applicationId, true),
    metadata: {
      applicationId: params.applicationId,
      applicationType: params.applicationType,
    },
  }));
}

export async function buildWorkflowMessageNotifications(
  prisma: PrismaService,
  params: {
    applicationId: string;
    authorUserId: string;
    authorFirstName?: string | null;
    authorLastName?: string | null;
    authorStructuralUnitId?: string | null;
    createdByStructuralUnitId?: string | null;
    submissionMode?: string | null;
    recipientUnitIds: string[];
    structuralUnitSectionId?: string | null;
    content: string;
  },
): Promise<CreateNotificationDto[]> {
  const { incomingRecipients, submitRecipients } = getOppositeUnitIds(
    params.authorStructuralUnitId,
    params.createdByStructuralUnitId,
    params.recipientUnitIds,
  );

  const authorName = [params.authorFirstName, params.authorLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const preview = truncateText(params.content || 'Fayl yuborildi');
  const message = `${authorName || 'Foydalanuvchi'}: "${preview}"`;

  const notifications: CreateNotificationDto[] = [];

  const incomingUserIds =
    incomingRecipients.length > 0
      ? await resolveApplicationIncomingRecipientUserIds(
          prisma,
          {
            submissionMode: params.submissionMode,
            structuralUnitIds: incomingRecipients,
            structuralUnitSectionId: params.structuralUnitSectionId,
          },
          [params.authorUserId],
        )
      : [];

  for (const userId of incomingUserIds) {
    notifications.push({
      userId,
      type: NOTIFICATION_TYPES.APPLICATION_WORKFLOW_MESSAGE,
      title: 'Dastur bo\'yicha yangi xabar',
      message,
      linkPath: buildWorkflowLinkPath(params.applicationId, true),
      metadata: { applicationId: params.applicationId },
    });
  }

  const submitUserIds = await findUsersByStructuralUnitIds(
    prisma,
    submitRecipients,
    [params.authorUserId],
  );
  for (const userId of submitUserIds) {
    notifications.push({
      userId,
      type: NOTIFICATION_TYPES.APPLICATION_WORKFLOW_MESSAGE,
      title: 'Dastur bo\'yicha yangi xabar',
      message,
      linkPath: buildWorkflowLinkPath(params.applicationId, false),
      metadata: { applicationId: params.applicationId },
    });
  }

  return notifications;
}

export async function buildWorkflowStatusNotifications(
  prisma: PrismaService,
  params: {
    applicationId: string;
    authorUserId: string;
    authorFirstName?: string | null;
    authorLastName?: string | null;
    authorStructuralUnitId?: string | null;
    createdByStructuralUnitId?: string | null;
    submissionMode?: string | null;
    recipientUnitIds: string[];
    structuralUnitSectionId?: string | null;
    workflowStatus: string;
  },
): Promise<CreateNotificationDto[]> {
  const { incomingRecipients, submitRecipients } = getOppositeUnitIds(
    params.authorStructuralUnitId,
    params.createdByStructuralUnitId,
    params.recipientUnitIds,
  );

  const authorName = [params.authorFirstName, params.authorLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const statusLabel = WORKFLOW_STATUS_LABELS[params.workflowStatus] ?? params.workflowStatus;
  const message = `${authorName || 'Foydalanuvchi'} dastur statusini "${statusLabel}" ga o'zgartirdi.`;

  const notifications: CreateNotificationDto[] = [];

  const incomingUserIds =
    incomingRecipients.length > 0
      ? await resolveApplicationIncomingRecipientUserIds(
          prisma,
          {
            submissionMode: params.submissionMode,
            structuralUnitIds: incomingRecipients,
            structuralUnitSectionId: params.structuralUnitSectionId,
          },
          [params.authorUserId],
        )
      : [];

  for (const userId of incomingUserIds) {
    notifications.push({
      userId,
      type: NOTIFICATION_TYPES.APPLICATION_WORKFLOW_STATUS,
      title: 'Dastur statusi yangilandi',
      message,
      linkPath: buildWorkflowLinkPath(params.applicationId, true),
      metadata: {
        applicationId: params.applicationId,
        workflowStatus: params.workflowStatus,
      },
    });
  }

  const submitUserIds = await findUsersByStructuralUnitIds(
    prisma,
    submitRecipients,
    [params.authorUserId],
  );
  for (const userId of submitUserIds) {
    notifications.push({
      userId,
      type: NOTIFICATION_TYPES.APPLICATION_WORKFLOW_STATUS,
      title: 'Dastur statusi yangilandi',
      message,
      linkPath: buildWorkflowLinkPath(params.applicationId, false),
      metadata: {
        applicationId: params.applicationId,
        workflowStatus: params.workflowStatus,
      },
    });
  }

  return notifications;
}
