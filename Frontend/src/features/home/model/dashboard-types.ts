import type { DashboardApplicationScope } from '@/features/home/lib/dashboard-filters'

export interface DashboardSummaryContext {
  userName: string
  structuralUnitId: string
  canViewAll: boolean
  headedUnitIds: string[]
}

export interface DashboardSummaryFilters {
  structuralUnitId: string | null
  scopeType: 'structure' | 'section' | null
  sectionId: string | null
  fromYear: number | null
  fromMonth: number | null
  toYear: number | null
  toMonth: number | null
  applicationScope: DashboardApplicationScope
}

export interface DashboardApplicationKpis {
  total: number
  inProgress: number
  completed: number
  cancelled: number
  overdue: number
  submitted: number
  incoming: number
}

export interface DashboardPprKpis {
  draftMonths: number
  pendingApprovalMonths: number
  approvedMonths: number
  plannedExecutions: number
  completedExecutions: number
  executionPercent: number
}

export interface DashboardRecentApplication {
  id: string
  type: string
  status: string
  workflowStatus: string
  deadline?: string
  createdByFirstName?: string
  createdByLastName?: string
  createdByStructuralUnitId?: string
  structuralUnitIds: string[]
  createdAt: string
  updatedAt: string
  isOverdue: boolean
}

export interface DashboardUpcomingDeadline {
  id: string
  type: string
  status: string
  workflowStatus: string
  deadline?: string
  createdByFirstName?: string
  createdByLastName?: string
  isOverdue: boolean
  daysRemaining: number | null
}

export interface DashboardRecentNotification {
  id: string
  type: string
  title: string
  message: string
  linkPath?: string | null
  read: boolean
  createdAt: string
}

export interface DashboardSummary {
  context: DashboardSummaryContext
  filters: DashboardSummaryFilters
  kpis: {
    applications: DashboardApplicationKpis
    ppr: DashboardPprKpis
    notifications: {
      unread: number
    }
  }
  recentApplications: DashboardRecentApplication[]
  upcomingDeadlines: DashboardUpcomingDeadline[]
  recentNotifications: DashboardRecentNotification[]
}
