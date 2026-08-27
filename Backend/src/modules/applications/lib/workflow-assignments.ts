import { randomUUID } from 'crypto';

export const WORKFLOW_ASSIGNMENT_STATUSES = [
  'pending_accept',
  'accepted',
  'replied',
  'forwarded',
  'released',
] as const;

export type WorkflowAssignmentStatus = (typeof WORKFLOW_ASSIGNMENT_STATUSES)[number];

export interface WorkflowAssignment {
  id: string;
  userId: string;
  assignedByUserId: string;
  parentAssignmentId: string | null;
  status: WorkflowAssignmentStatus;
  replyMessageId?: string | null;
  forwardedToAssignmentId?: string | null;
  acceptedAt?: string | null;
  repliedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

function isAssignment(value: unknown): value is WorkflowAssignment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === 'string' &&
    typeof item.userId === 'string' &&
    typeof item.assignedByUserId === 'string' &&
    (item.parentAssignmentId === null || typeof item.parentAssignmentId === 'string') &&
    typeof item.status === 'string' &&
    WORKFLOW_ASSIGNMENT_STATUSES.includes(item.status as WorkflowAssignmentStatus) &&
    typeof item.createdAt === 'string'
  );
}

export function normalizeWorkflowAssignments(value: unknown): WorkflowAssignment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAssignment);
}

export function createInitialWorkflowAssignments(
  recipientUserIds: string[],
  assignedByUserId: string,
  now = new Date(),
): WorkflowAssignment[] {
  const createdAt = now.toISOString();

  return recipientUserIds.map((userId) => ({
    id: randomUUID(),
    userId,
    assignedByUserId,
    parentAssignmentId: null,
    status: 'pending_accept',
    replyMessageId: null,
    forwardedToAssignmentId: null,
    acceptedAt: null,
    repliedAt: null,
    releasedAt: null,
    createdAt,
  }));
}

export function findUserAssignment(
  assignments: WorkflowAssignment[],
  userId: string,
): WorkflowAssignment | undefined {
  return assignments
    .filter((item) => item.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function findChildAssignments(
  assignments: WorkflowAssignment[],
  parentAssignmentId: string,
): WorkflowAssignment[] {
  return assignments.filter((item) => item.parentAssignmentId === parentAssignmentId);
}

export function isUserInWorkflowChain(
  assignments: WorkflowAssignment[],
  userId: string,
): boolean {
  return assignments.some(
    (item) => item.userId === userId || item.assignedByUserId === userId,
  );
}

export function replaceAssignment(
  assignments: WorkflowAssignment[],
  next: WorkflowAssignment,
): WorkflowAssignment[] {
  return assignments.map((item) => (item.id === next.id ? next : item));
}

export function allRootAssignmentsReleased(assignments: WorkflowAssignment[]): boolean {
  const roots = assignments.filter((item) => item.parentAssignmentId === null);

  if (roots.length === 0) {
    return false;
  }

  return roots.every((root) => {
    if (root.status === 'released') {
      return true;
    }

    if (root.status === 'replied') {
      return true;
    }

    if (root.status === 'forwarded' && root.forwardedToAssignmentId) {
      const child = assignments.find((item) => item.id === root.forwardedToAssignmentId);
      return child?.status === 'released' || child?.status === 'replied';
    }

    return false;
  });
}
