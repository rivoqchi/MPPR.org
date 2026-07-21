import { App, ConfigProvider } from 'antd'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from '@/features/home/ui/HomePage'
import '@/shared/lib/i18n'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock('@/shared/api/dashboard-api', () => ({
  fetchDashboardSummary: vi.fn().mockResolvedValue({
    context: {
      userName: 'Test User',
      structuralUnitId: 'unit-1',
      canViewAll: true,
      headedUnitIds: [],
    },
    filters: {
      structuralUnitId: null,
      scopeType: null,
      sectionId: null,
      fromYear: 2026,
      fromMonth: 1,
      toYear: 2026,
      toMonth: 12,
      applicationScope: 'all',
    },
    kpis: {
      applications: {
        total: 2,
        inProgress: 1,
        completed: 1,
        cancelled: 0,
        overdue: 0,
        submitted: 1,
        incoming: 1,
      },
      ppr: {
        draftMonths: 1,
        pendingApprovalMonths: 0,
        approvedMonths: 2,
        plannedExecutions: 10,
        completedExecutions: 5,
        executionPercent: 50,
      },
      notifications: {
        unread: 1,
      },
    },
    priorityIncomingApplications: [
      {
        id: 'application-1',
        type: 'execution',
        status: 'in_progress',
        workflowStatus: 'in_progress_work',
        createdAt: '2026-07-21T08:00:00.000Z',
        deadline: '2026-07-21',
        createdByFirstName: 'Ali',
        createdByLastName: 'Valiyev',
        structuralUnitIds: ['unit-1'],
        isOverdue: false,
        updatedAt: '2026-07-21T09:00:00.000Z',
      },
    ],
    todayPprTasks: [
      {
        entryId: 'entry-1',
        monthId: 'month-1',
        date: '2026-07-21',
        pprTypeId: 'ppr-1',
        pprTypeName: 'Nasos tekshiruvi',
        structuralUnitId: 'unit-1',
        objectIds: ['object-1', 'object-2'],
        completedObjectIds: ['object-1'],
        completionPercent: 50,
        executionStatus: 'in_progress',
        canExecute: true,
        isOverdue: false,
        comment: '',
      },
    ],
    recentApplications: [],
    upcomingDeadlines: [],
    recentNotifications: [],
  }),
}))

vi.mock('@/entities/structural-unit/model/structural-units-store', () => ({
  useStructuralUnitsStore: (selector: (state: { structuralUnits: []; isHydrated: boolean }) => unknown) =>
    selector({
      structuralUnits: [],
      isHydrated: true,
    }),
}))

vi.mock('@/shared/hooks/useStructuralUnitScope', () => ({
  useStructuralUnitScope: () => ({
    canViewAll: true,
    currentUser: {
      id: 'user-1',
      firstName: 'Test',
      structuralUnitId: 'unit-1',
    },
  }),
}))

vi.mock('@/shared/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({
    canView: () => true,
    canCreate: () => true,
    canEdit: () => true,
  }),
}))

function renderHomePage() {
  return render(
    <ConfigProvider>
      <App>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </App>
    </ConfigProvider>,
  )
}

describe('HomePage', () => {
  it('renders dashboard title', async () => {
    renderHomePage()

    expect(await screen.findByText(/Xush kelibsiz, Test/i)).toBeInTheDocument()
  })
})
