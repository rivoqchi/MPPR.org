import type { WorkflowAssignment, WorkflowAssignmentStatus } from '@/entities/application/model/types'

export function findUserWorkflowAssignment(
  assignments: WorkflowAssignment[] | undefined,
  userId: string | undefined,
): WorkflowAssignment | undefined {
  if (!userId || !Array.isArray(assignments)) {
    return undefined
  }

  return assignments
    .filter((item) => item.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

export function findSupervisedAssignments(
  assignments: WorkflowAssignment[] | undefined,
  userId: string | undefined,
): WorkflowAssignment[] {
  if (!userId || !Array.isArray(assignments)) {
    return []
  }

  return assignments.filter(
    (item) =>
      item.assignedByUserId === userId &&
      (item.status === 'replied' || item.status === 'forwarded'),
  )
}

export function getAssignmentStatusLabelKey(status: WorkflowAssignmentStatus): string {
  return `applicationWorkflow.assignmentStatus.${status}`
}
