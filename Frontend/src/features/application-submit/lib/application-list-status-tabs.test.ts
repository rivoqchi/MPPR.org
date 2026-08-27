import { describe, expect, it } from 'vitest'
import type { Application, WorkflowAssignment } from '@/entities/application/model/types'
import {
  countApplicationsByStatusTab,
  filterApplicationsByStatusTab,
  matchesApplicationListStatusTab,
} from '@/features/application-submit/lib/application-list-status-tabs'

function createAssignment(
  overrides: Partial<WorkflowAssignment> & Pick<WorkflowAssignment, 'id' | 'userId'>,
): WorkflowAssignment {
  return {
    assignedByUserId: 'submitter',
    parentAssignmentId: null,
    status: 'pending_accept',
    createdAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

function createApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    submissionMode: 'combined',
    recipientUserIds: ['user-1'],
    structuralUnitIds: ['unit-1'],
    type: 'execution',
    status: 'in_progress',
    workflowStatus: 'in_progress_work',
    workflowUnitStatuses: [
      {
        structuralUnitId: 'unit-1',
        workflowStatus: 'in_progress_work',
        confirmationFiles: [],
      },
    ],
    workflowAssignments: [
      createAssignment({ id: 'a1', userId: 'user-1', status: 'accepted' }),
    ],
    images: [],
    files: [],
    comment: 'Test',
    specialMessages: [],
    confirmationFiles: [],
    createdByUserId: 'submitter',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('application-list-status-tabs', () => {
  const completed = createApplication({
    id: 'completed',
    status: 'completed',
    workflowStatus: 'confirmed',
    deadline: '2026-08-20',
    updatedAt: '2026-08-10T12:00:00.000Z',
  })

  const completedLate = createApplication({
    id: 'completed-late',
    status: 'completed',
    workflowStatus: 'confirmed',
    deadline: '2026-08-10',
    updatedAt: '2026-08-15T12:00:00.000Z',
  })

  const inProgress = createApplication({
    id: 'in-progress',
    status: 'in_progress',
    workflowStatus: 'in_progress_work',
  })

  const pendingConfirmation = createApplication({
    id: 'pending',
    status: 'in_progress',
    workflowStatus: 'pending_confirmation',
  })

  const unseen = createApplication({
    id: 'unseen',
    workflowAssignments: [
      createAssignment({ id: 'a1', userId: 'user-1', status: 'pending_accept' }),
    ],
  })

  const coExecutor = createApplication({
    id: 'co',
    recipientUserIds: ['user-1', 'user-2'],
    workflowAssignments: [
      createAssignment({ id: 'a1', userId: 'user-1', status: 'forwarded' }),
      createAssignment({
        id: 'a2',
        userId: 'user-2',
        parentAssignmentId: 'a1',
        status: 'accepted',
      }),
    ],
  })

  const cancelled = createApplication({
    id: 'cancelled',
    status: 'cancelled',
    workflowStatus: 'cancelled',
  })

  const apps = [
    completed,
    completedLate,
    inProgress,
    pendingConfirmation,
    unseen,
    coExecutor,
    cancelled,
  ]

  it('matches completed and completed-late separately', () => {
    expect(matchesApplicationListStatusTab(completed, 'completed')).toBe(true)
    expect(matchesApplicationListStatusTab(completedLate, 'completed')).toBe(true)
    expect(matchesApplicationListStatusTab(completed, 'completed_late')).toBe(false)
    expect(matchesApplicationListStatusTab(completedLate, 'completed_late')).toBe(true)
  })

  it('treats pending confirmation as not completed but not in progress', () => {
    expect(matchesApplicationListStatusTab(pendingConfirmation, 'not_completed')).toBe(true)
    expect(matchesApplicationListStatusTab(pendingConfirmation, 'in_progress')).toBe(false)
    expect(matchesApplicationListStatusTab(pendingConfirmation, 'pending_confirmation')).toBe(true)
  })

  it('detects unseen and co-executor applications', () => {
    expect(matchesApplicationListStatusTab(unseen, 'unseen')).toBe(true)
    expect(matchesApplicationListStatusTab(inProgress, 'unseen')).toBe(false)
    expect(matchesApplicationListStatusTab(coExecutor, 'co_executor')).toBe(true)
  })

  it('excludes cancelled from completed and not_completed', () => {
    expect(matchesApplicationListStatusTab(cancelled, 'completed')).toBe(false)
    expect(matchesApplicationListStatusTab(cancelled, 'not_completed')).toBe(false)
    expect(matchesApplicationListStatusTab(cancelled, 'all')).toBe(true)
  })

  it('filters and counts by tab', () => {
    expect(filterApplicationsByStatusTab(apps, 'all')).toHaveLength(7)
    expect(filterApplicationsByStatusTab(apps, 'completed').map((item) => item.id)).toEqual([
      'completed',
      'completed-late',
    ])
    expect(filterApplicationsByStatusTab(apps, 'pending_confirmation')).toHaveLength(1)

    const counts = countApplicationsByStatusTab(apps)
    expect(counts.all).toBe(7)
    expect(counts.completed).toBe(2)
    expect(counts.completed_late).toBe(1)
    expect(counts.pending_confirmation).toBe(1)
    expect(counts.unseen).toBe(1)
    expect(counts.co_executor).toBe(1)
  })
})
