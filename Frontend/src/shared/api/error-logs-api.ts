import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  CreateErrorLogPayload,
  ErrorLog,
  ErrorLogsListResponse,
  ErrorLogSeverity,
  ErrorLogSource,
} from '@/entities/error-log/model/types'

export async function fetchErrorLogs(params: {
  page?: number
  limit?: number
  source?: ErrorLogSource
  severity?: ErrorLogSeverity
  resolved?: boolean
  search?: string
}): Promise<ErrorLogsListResponse> {
  const response = await api.get('/error-logs', { params })
  return unwrapApiResponse<ErrorLogsListResponse>(response)
}

export async function reportErrorLog(payload: CreateErrorLogPayload): Promise<ErrorLog> {
  const response = await api.post('/error-logs', payload)
  return unwrapApiResponse<ErrorLog>(response)
}

export async function resolveErrorLog(id: string): Promise<ErrorLog> {
  const response = await api.patch(`/error-logs/${id}/resolve`)
  return unwrapApiResponse<ErrorLog>(response)
}
