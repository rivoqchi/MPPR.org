import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type { Application, ApplicationFormValues } from '@/entities/application/model/types'

export async function fetchApplications(): Promise<Application[]> {
  const response = await api.get('/applications')
  return unwrapApiResponse<Application[]>(response)
}

export async function createApplication(data: ApplicationFormValues): Promise<Application> {
  const response = await api.post('/applications', data)
  return unwrapApiResponse<Application>(response)
}

export async function updateApplication(
  id: string,
  data: ApplicationFormValues,
): Promise<Application> {
  const response = await api.patch(`/applications/${id}`, data)
  return unwrapApiResponse<Application>(response)
}

export async function deleteApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`)
}
