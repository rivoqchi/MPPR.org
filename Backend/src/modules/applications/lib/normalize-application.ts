import { ApplicationAttachmentDto } from '../dto/application-attachment.dto';
import { ApplicationSpecialMessageDto } from '../dto/application-special-message.dto';
import { ApplicationWorkflowStatus } from '../dto/application-workflow.dto';
import {
  aggregateWorkflowStatus,
  ensureWorkflowUnitStatuses,
  isWorkflowFinalized,
  mergeConfirmationFiles,
} from './workflow-unit-status';

function isAttachment(value: unknown): value is ApplicationAttachmentDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const attachment = value as Partial<ApplicationAttachmentDto>;

  return (
    typeof attachment.id === 'string' &&
    typeof attachment.name === 'string' &&
    typeof attachment.mimeType === 'string' &&
    typeof attachment.size === 'number' &&
    (attachment.kind === 'image' || attachment.kind === 'file')
  );
}

function isSpecialMessage(value: unknown): value is ApplicationSpecialMessageDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const message = value as Partial<ApplicationSpecialMessageDto>;

  return (
    typeof message.structuralUnitId === 'string' &&
    typeof message.message === 'string'
  );
}

export function normalizeAttachments(value: unknown): ApplicationAttachmentDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAttachment).map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    ...(attachment.dataUrl ? { dataUrl: attachment.dataUrl } : {}),
  }));
}

export function normalizeSpecialMessages(value: unknown): ApplicationSpecialMessageDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isSpecialMessage).map((message) => ({
    structuralUnitId: message.structuralUnitId,
    message: message.message,
  }));
}

export function normalizeStructuralUnitIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function mapApplicationRecord<
  T extends {
    structuralUnitIds: unknown;
    images: unknown;
    files: unknown;
    specialMessages: unknown;
    confirmationFiles?: unknown;
    workflowStatus?: string;
    workflowUnitStatuses?: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
>(application: T) {
  const structuralUnitIds = normalizeStructuralUnitIds(application.structuralUnitIds);
  const storedWorkflowStatus = (application.workflowStatus ??
    'in_progress_work') as ApplicationWorkflowStatus;
  const workflowUnitStatuses = ensureWorkflowUnitStatuses(
    structuralUnitIds,
    application.workflowUnitStatuses,
    storedWorkflowStatus,
  );
  const workflowStatus = isWorkflowFinalized(storedWorkflowStatus)
    ? storedWorkflowStatus
    : aggregateWorkflowStatus(workflowUnitStatuses);
  const normalizedUnitStatuses = isWorkflowFinalized(storedWorkflowStatus)
    ? workflowUnitStatuses.map((unit) => ({
        ...unit,
        workflowStatus: storedWorkflowStatus,
      }))
    : workflowUnitStatuses;

  return {
    ...application,
    structuralUnitIds,
    images: normalizeAttachments(application.images),
    files: normalizeAttachments(application.files),
    specialMessages: normalizeSpecialMessages(application.specialMessages),
    workflowUnitStatuses: normalizedUnitStatuses,
    workflowStatus,
    confirmationFiles: mergeConfirmationFiles(normalizedUnitStatuses),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

export function mapWorkflowMessageRecord<
  T extends {
    attachments: unknown;
    createdAt: Date;
  },
>(message: T) {
  return {
    ...message,
    attachments: normalizeAttachments(message.attachments),
    createdAt: message.createdAt.toISOString(),
  };
}
