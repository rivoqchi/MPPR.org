import { ApplicationAttachmentDto } from '../dto/application-attachment.dto';
import { ApplicationWorkflowStatus } from '../dto/application-workflow.dto';
import { normalizeAttachments } from './normalize-application';

export interface ApplicationWorkflowUnitStatusDto {
  structuralUnitId: string;
  workflowStatus: ApplicationWorkflowStatus;
  confirmationFiles: ApplicationAttachmentDto[];
}

const WORKFLOW_STATUSES: ApplicationWorkflowStatus[] = [
  'returned',
  'in_progress_work',
  'pending_confirmation',
  'confirmed',
  'cancelled',
];

function isWorkflowStatus(value: unknown): value is ApplicationWorkflowStatus {
  return typeof value === 'string' && WORKFLOW_STATUSES.includes(value as ApplicationWorkflowStatus);
}

function isWorkflowUnitStatus(value: unknown): value is ApplicationWorkflowUnitStatusDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Partial<ApplicationWorkflowUnitStatusDto>;

  return typeof item.structuralUnitId === 'string' && isWorkflowStatus(item.workflowStatus);
}

export function normalizeWorkflowUnitStatuses(value: unknown): ApplicationWorkflowUnitStatusDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isWorkflowUnitStatus).map((item) => ({
    structuralUnitId: item.structuralUnitId,
    workflowStatus: item.workflowStatus,
    confirmationFiles: normalizeAttachments(item.confirmationFiles),
  }));
}

export function syncWorkflowUnitStatuses(
  structuralUnitIds: string[],
  existing: ApplicationWorkflowUnitStatusDto[],
  fallbackStatus: ApplicationWorkflowStatus = 'in_progress_work',
): ApplicationWorkflowUnitStatusDto[] {
  return structuralUnitIds.map((structuralUnitId) => {
    const current = existing.find((item) => item.structuralUnitId === structuralUnitId);

    if (current) {
      return current;
    }

    return {
      structuralUnitId,
      workflowStatus: fallbackStatus,
      confirmationFiles: [],
    };
  });
}

export function aggregateWorkflowStatus(
  statuses: ApplicationWorkflowUnitStatusDto[],
): ApplicationWorkflowStatus {
  if (statuses.length === 0) {
    return 'in_progress_work';
  }

  const values = statuses.map((item) => item.workflowStatus);

  if (values.every((value) => value === 'pending_confirmation')) {
    return 'pending_confirmation';
  }

  if (values.every((value) => value === 'in_progress_work')) {
    return 'in_progress_work';
  }

  if (values.every((value) => value === 'returned')) {
    return 'returned';
  }

  return 'in_progress_work';
}

export function mergeConfirmationFiles(
  statuses: ApplicationWorkflowUnitStatusDto[],
): ApplicationAttachmentDto[] {
  return statuses.flatMap((item) => item.confirmationFiles);
}

export function allUnitsPendingConfirmation(
  statuses: ApplicationWorkflowUnitStatusDto[],
): boolean {
  return statuses.length > 0 && statuses.every((item) => item.workflowStatus === 'pending_confirmation');
}

export function isWorkflowFinalized(workflowStatus: string): boolean {
  return workflowStatus === 'confirmed' || workflowStatus === 'cancelled';
}

export function isApplicationFinalized(application: {
  status: string;
  workflowStatus?: string | null;
}): boolean {
  return (
    application.status === 'completed' ||
    application.status === 'cancelled' ||
    isWorkflowFinalized(application.workflowStatus ?? '')
  );
}

export function updateWorkflowUnitStatus(
  structuralUnitIds: string[],
  existing: ApplicationWorkflowUnitStatusDto[],
  structuralUnitId: string,
  workflowStatus: ApplicationWorkflowStatus,
  confirmationFiles: ApplicationAttachmentDto[] = [],
): ApplicationWorkflowUnitStatusDto[] {
  const synced = syncWorkflowUnitStatuses(structuralUnitIds, existing);

  return synced.map((item) => {
    if (item.structuralUnitId !== structuralUnitId) {
      return item;
    }

    return {
      ...item,
      workflowStatus,
      confirmationFiles:
        workflowStatus === 'pending_confirmation' ? confirmationFiles : item.confirmationFiles,
    };
  });
}

export function ensureWorkflowUnitStatuses(
  structuralUnitIds: string[],
  workflowUnitStatuses: unknown,
  workflowStatus: ApplicationWorkflowStatus,
): ApplicationWorkflowUnitStatusDto[] {
  const normalized = normalizeWorkflowUnitStatuses(workflowUnitStatuses);

  if (normalized.length > 0) {
    return syncWorkflowUnitStatuses(structuralUnitIds, normalized, workflowStatus);
  }

  return syncWorkflowUnitStatuses(structuralUnitIds, [], workflowStatus);
}
