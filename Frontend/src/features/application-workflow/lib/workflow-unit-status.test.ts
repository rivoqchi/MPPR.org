import { describe, expect, it } from 'vitest'
import {
  aggregateWorkflowStatus,
  allUnitsPendingConfirmation,
  canSubmitterFinalizeApplication,
} from '@/features/application-workflow/lib/workflow-unit-status'

describe('aggregateWorkflowStatus', () => {
  it('returns unanimous status when all units match', () => {
    expect(
      aggregateWorkflowStatus([
        { structuralUnitId: 'a', workflowStatus: 'in_progress_work', confirmationFiles: [] },
        { structuralUnitId: 'b', workflowStatus: 'in_progress_work', confirmationFiles: [] },
      ]),
    ).toBe('in_progress_work')

    expect(
      aggregateWorkflowStatus([
        { structuralUnitId: 'a', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
        { structuralUnitId: 'b', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
      ]),
    ).toBe('pending_confirmation')
  })

  it('keeps in progress when unit statuses are mixed', () => {
    expect(
      aggregateWorkflowStatus([
        { structuralUnitId: 'a', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
        { structuralUnitId: 'b', workflowStatus: 'in_progress_work', confirmationFiles: [] },
      ]),
    ).toBe('in_progress_work')
  })
})

describe('canSubmitterFinalizeApplication', () => {
  const baseApplication = {
    createdByStructuralUnitId: 'submitter',
    structuralUnitIds: ['unit-a', 'unit-b'],
    workflowStatus: 'pending_confirmation' as const,
    workflowUnitStatuses: [
      { structuralUnitId: 'unit-a', workflowStatus: 'pending_confirmation' as const, confirmationFiles: [] },
      { structuralUnitId: 'unit-b', workflowStatus: 'pending_confirmation' as const, confirmationFiles: [] },
    ],
  }

  it('allows submitter when all units are pending confirmation', () => {
    expect(canSubmitterFinalizeApplication(baseApplication, 'submitter')).toBe(true)
  })

  it('denies recipient units and mixed unit statuses', () => {
    expect(canSubmitterFinalizeApplication(baseApplication, 'unit-a')).toBe(false)
    expect(
      canSubmitterFinalizeApplication(
        {
          ...baseApplication,
          workflowUnitStatuses: [
            { structuralUnitId: 'unit-a', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
            { structuralUnitId: 'unit-b', workflowStatus: 'in_progress_work', confirmationFiles: [] },
          ],
        },
        'submitter',
      ),
    ).toBe(false)
  })
})

describe('allUnitsPendingConfirmation', () => {
  it('returns true only when every unit is pending confirmation', () => {
    expect(
      allUnitsPendingConfirmation({
        structuralUnitIds: ['a', 'b'],
        workflowStatus: 'pending_confirmation',
        workflowUnitStatuses: [
          { structuralUnitId: 'a', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
          { structuralUnitId: 'b', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
        ],
      }),
    ).toBe(true)

    expect(
      allUnitsPendingConfirmation({
        structuralUnitIds: ['a', 'b'],
        workflowStatus: 'in_progress_work',
        workflowUnitStatuses: [
          { structuralUnitId: 'a', workflowStatus: 'pending_confirmation', confirmationFiles: [] },
          { structuralUnitId: 'b', workflowStatus: 'in_progress_work', confirmationFiles: [] },
        ],
      }),
    ).toBe(false)
  })
})
