import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type { DashboardSummary } from '@/features/home/model/dashboard-types'
import type { DashboardSummaryQuery } from '@/features/home/lib/dashboard-filters'

export async function fetchDashboardSummary(
  query: DashboardSummaryQuery,
): Promise<DashboardSummary> {
  const response = await api.get('/dashboard/summary', { params: query })
  return unwrapApiResponse<DashboardSummary>(response)
}
