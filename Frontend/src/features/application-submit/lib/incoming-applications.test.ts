import { describe, expect, it } from 'vitest'
import type { Application } from '@/entities/application/model/types'
import { filterIncomingApplications } from '@/features/application-submit/lib/incoming-applications'

const applications: Application[] = [
  {
    id: 'a1',
    structuralUnitIds: ['unit-a'],
    type: 'information',
    status: 'in_progress',
    workflowStatus: 'in_progress_work',
    comment: 'First',
    images: [],
    files: [],
    specialMessages: [],
    confirmationFiles: [],
    workflowUnitStatuses: [],
    createdByUserId: 'u1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'a2',
    structuralUnitIds: ['unit-b'],
    type: 'execution',
    status: 'in_progress',
    workflowStatus: 'in_progress_work',
    comment: 'Second',
    images: [],
    files: [],
    specialMessages: [],
    confirmationFiles: [],
    workflowUnitStatuses: [],
    createdByUserId: 'u2',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
]

describe('filterIncomingApplications', () => {
  it('returns all applications when canViewAll is enabled', () => {
    expect(filterIncomingApplications(applications, 'unit-a', true)).toHaveLength(2)
  })

  it('filters applications by structural unit for scoped users', () => {
    expect(filterIncomingApplications(applications, 'unit-a', false)).toEqual([applications[0]])
  })

  it('returns empty list when structural unit is missing for scoped users', () => {
    expect(filterIncomingApplications(applications, undefined, false)).toEqual([])
  })
})
