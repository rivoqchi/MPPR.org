import { describe, expect, it } from 'vitest'
import type { Application } from '@/entities/application/model/types'
import { filterIncomingApplications } from '@/features/application-submit/lib/incoming-applications'

const applications: Application[] = [
  {
    id: 'a1',
    submissionMode: 'combined',
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
    submissionMode: 'combined',
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
  {
    id: 'a3',
    submissionMode: 'single',
    structuralUnitIds: ['unit-a'],
    structuralUnitSectionId: 'section-1',
    type: 'information',
    status: 'in_progress',
    workflowStatus: 'in_progress_work',
    comment: 'Single',
    images: [],
    files: [],
    specialMessages: [],
    confirmationFiles: [],
    workflowUnitStatuses: [],
    createdByUserId: 'u3',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
]

const structuralUnits = [
  {
    id: 'unit-a',
    originalName: 'Unit A',
    shortName: 'A',
    headFullName: 'Head A',
    headUserId: 'head-a',
    documents: [],
    sections: [
      {
        id: 'section-1',
        originalName: 'Section 1',
        shortName: 'S1',
        headUserId: 'section-head',
        documents: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
]

describe('filterIncomingApplications', () => {
  it('returns all applications when canViewAll is enabled', () => {
    expect(
      filterIncomingApplications(applications, {
        structuralUnitId: 'unit-a',
        canViewAll: true,
        structuralUnits,
      }),
    ).toHaveLength(3)
  })

  it('filters combined applications by structural unit for scoped users', () => {
    expect(
      filterIncomingApplications(applications, {
        structuralUnitId: 'unit-a',
        userId: 'member-a',
        canViewAll: false,
        structuralUnits,
      }),
    ).toEqual([applications[0]])
  })

  it('shows single applications only to unit or section heads', () => {
    expect(
      filterIncomingApplications(applications, {
        structuralUnitId: 'unit-a',
        userId: 'head-a',
        canViewAll: false,
        structuralUnits,
      }),
    ).toEqual([applications[0], applications[2]])

    expect(
      filterIncomingApplications(applications, {
        structuralUnitId: 'unit-a',
        userId: 'section-head',
        canViewAll: false,
        structuralUnits,
      }),
    ).toEqual([applications[0], applications[2]])
  })

  it('returns empty list when structural unit is missing for scoped users', () => {
    expect(
      filterIncomingApplications(applications, {
        canViewAll: false,
        structuralUnits,
      }),
    ).toEqual([])
  })
})
