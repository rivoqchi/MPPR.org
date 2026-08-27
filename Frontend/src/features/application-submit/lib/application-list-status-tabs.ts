import dayjs from 'dayjs'
import type { Application } from '@/entities/application/model/types'
import { isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { isWorkflowFinalized } from '@/features/application-workflow/lib/workflow-unit-status'

export const APPLICATION_LIST_STATUS_TAB_KEYS = [
  'all',
  'completed',
  'not_completed',
  'in_progress',
  'completed_late',
  'pending_confirmation',
  'unseen',
  'co_executor',
] as const

export type ApplicationListStatusTabKey = (typeof APPLICATION_LIST_STATUS_TAB_KEYS)[number]

export function isApplicationCompleted(
  application: Pick<Application, 'status' | 'workflowStatus'>,
): boolean {
  return (
    application.status === 'completed' ||
    application.workflowStatus === 'confirmed'
  )
}

export function isApplicationCancelled(
  application: Pick<Application, 'status' | 'workflowStatus'>,
): boolean {
  return (
    application.status === 'cancelled' ||
    application.workflowStatus === 'cancelled'
  )
}

export function isApplicationNotCompleted(application: Application): boolean {
  return !isApplicationFinalized(application)
}

export function isApplicationInProgress(application: Application): boolean {
  if (isApplicationFinalized(application)) {
    return false
  }

  if (application.workflowStatus === 'pending_confirmation') {
    return false
  }

  return (
    application.workflowStatus === 'in_progress_work' ||
    application.workflowStatus === 'returned' ||
    application.status === 'in_progress'
  )
}

export function isApplicationCompletedLate(application: Application): boolean {
  if (!isApplicationCompleted(application) || isApplicationCancelled(application)) {
    return false
  }

  if (!application.deadline) {
    return false
  }

  const deadline = dayjs(application.deadline).startOf('day')
  const completedAt = dayjs(application.updatedAt)

  return completedAt.isValid() && deadline.isValid() && completedAt.isAfter(deadline.endOf('day'))
}

export function isApplicationPendingConfirmation(application: Application): boolean {
  return (
    !isWorkflowFinalized(application.workflowStatus) &&
    application.workflowStatus === 'pending_confirmation'
  )
}

export function isApplicationUnseen(application: Application): boolean {
  if (isApplicationFinalized(application)) {
    return false
  }

  const rootAssignments = (application.workflowAssignments ?? []).filter(
    (item) => !item.parentAssignmentId,
  )

  if (rootAssignments.length === 0) {
    return false
  }

  return rootAssignments.some((item) => item.status === 'pending_accept')
}

export function isApplicationCoExecutor(application: Application): boolean {
  const assignments = application.workflowAssignments ?? []
  const hasForwardedAssignee = assignments.some((item) => Boolean(item.parentAssignmentId))
  const hasMultipleRecipients = (application.recipientUserIds ?? []).length > 1

  return hasForwardedAssignee || hasMultipleRecipients
}

export function matchesApplicationListStatusTab(
  application: Application,
  tab: ApplicationListStatusTabKey,
): boolean {
  switch (tab) {
    case 'all':
      return true
    case 'completed':
      return isApplicationCompleted(application) && !isApplicationCancelled(application)
    case 'not_completed':
      return isApplicationNotCompleted(application)
    case 'in_progress':
      return isApplicationInProgress(application)
    case 'completed_late':
      return isApplicationCompletedLate(application)
    case 'pending_confirmation':
      return isApplicationPendingConfirmation(application)
    case 'unseen':
      return isApplicationUnseen(application)
    case 'co_executor':
      return isApplicationCoExecutor(application)
    default:
      return true
  }
}

export function filterApplicationsByStatusTab(
  applications: Application[],
  tab: ApplicationListStatusTabKey,
): Application[] {
  if (tab === 'all') {
    return applications
  }

  return applications.filter((application) => matchesApplicationListStatusTab(application, tab))
}

export function countApplicationsByStatusTab(
  applications: Application[],
): Record<ApplicationListStatusTabKey, number> {
  const counts = Object.fromEntries(
    APPLICATION_LIST_STATUS_TAB_KEYS.map((key) => [key, 0]),
  ) as Record<ApplicationListStatusTabKey, number>

  counts.all = applications.length

  for (const application of applications) {
    for (const key of APPLICATION_LIST_STATUS_TAB_KEYS) {
      if (key === 'all') {
        continue
      }

      if (matchesApplicationListStatusTab(application, key)) {
        counts[key] += 1
      }
    }
  }

  return counts
}

export function getApplicationListStatusTabLabelKey(tab: ApplicationListStatusTabKey): string {
  return `applicationSubmit.statusTabs.${tab}`
}
