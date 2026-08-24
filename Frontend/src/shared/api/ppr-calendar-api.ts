import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  CreatePprCalendarEntryPayload,
  MovePprCalendarEntryPayload,
  PprCalendarEntry,
  PprCalendarEntryFormValues,
  PprCalendarMonth,
  PprCalendarMonthQuery,
} from '@/entities/ppr-calendar/model/types'
import type { ExecutePprCalendarEntryPayload } from '@/entities/ppr-calendar/model/types'

export async function fetchPprCalendarMonth(
  query: PprCalendarMonthQuery,
): Promise<PprCalendarMonth> {
  const response = await api.get('/ppr-calendar/months', { params: query })
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function fetchPendingPprCalendarMonths(
  structuralUnitId?: string,
): Promise<PprCalendarMonth[]> {
  const response = await api.get('/ppr-calendar/months/pending', {
    params: structuralUnitId ? { structuralUnitId } : undefined,
  })
  return unwrapApiResponse<PprCalendarMonth[]>(response)
}

export async function createPprCalendarEntry(
  payload: CreatePprCalendarEntryPayload,
): Promise<PprCalendarMonth> {
  const response = await api.post('/ppr-calendar/entries', payload)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function updatePprCalendarEntry(
  id: string,
  payload: Partial<PprCalendarEntryFormValues & MovePprCalendarEntryPayload & { entrySectionId?: string }>,
): Promise<PprCalendarEntry> {
  const response = await api.patch(`/ppr-calendar/entries/${id}`, payload)
  return unwrapApiResponse<PprCalendarEntry>(response)
}

export async function deletePprCalendarEntry(id: string): Promise<void> {
  await api.delete(`/ppr-calendar/entries/${id}`)
}

export async function submitPprCalendarMonth(id: string): Promise<PprCalendarMonth> {
  const response = await api.post(`/ppr-calendar/months/${id}/submit`)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function approvePprCalendarMonth(id: string): Promise<PprCalendarMonth> {
  const response = await api.post(`/ppr-calendar/months/${id}/approve`)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function rejectPprCalendarMonth(id: string): Promise<PprCalendarMonth> {
  const response = await api.post(`/ppr-calendar/months/${id}/reject`)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function clearPprCalendarMonth(id: string): Promise<PprCalendarMonth> {
  const response = await api.post(`/ppr-calendar/months/${id}/clear`)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function executePprCalendarEntry(
  entryId: string,
  payload: ExecutePprCalendarEntryPayload,
): Promise<PprCalendarMonth> {
  const response = await api.post(`/ppr-calendar/entries/${entryId}/execute`, payload)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function fetchApprovedPprCalendarMonths(params?: {
  structuralUnitId?: string
  scopeType?: 'structure' | 'section'
  sectionId?: string
  fromYear?: number
  fromMonth?: number
  toYear?: number
  toMonth?: number
  year?: number
  month?: number
}): Promise<PprCalendarMonth[]> {
  const response = await api.get('/ppr-calendar/admin/months/approved', { params })
  return unwrapApiResponse<PprCalendarMonth[]>(response)
}

export async function fetchApprovedPprCalendarMonthById(monthId: string): Promise<PprCalendarMonth> {
  const response = await api.get(`/ppr-calendar/admin/months/${monthId}`)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function adminClearPprCalendarMonth(monthId: string): Promise<PprCalendarMonth> {
  const response = await api.post(`/ppr-calendar/admin/months/${monthId}/clear`)
  return unwrapApiResponse<PprCalendarMonth>(response)
}

export async function adminDeletePprCalendarEntry(entryId: string): Promise<PprCalendarMonth> {
  const response = await api.delete(`/ppr-calendar/admin/entries/${entryId}`)
  return unwrapApiResponse<{ month: PprCalendarMonth }>(response).then((data) => data.month)
}
