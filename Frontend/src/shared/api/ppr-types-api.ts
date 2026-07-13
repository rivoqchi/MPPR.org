import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type { PprType, PprTypeFormValues } from '@/entities/ppr-type/model/types'

export async function fetchPprTypes(): Promise<PprType[]> {
  const response = await api.get('/ppr-types')
  return unwrapApiResponse<PprType[]>(response)
}

export async function createPprType(data: PprTypeFormValues): Promise<PprType> {
  const response = await api.post('/ppr-types', data)
  return unwrapApiResponse<PprType>(response)
}

export async function updatePprType(id: string, data: PprTypeFormValues): Promise<PprType> {
  const response = await api.patch(`/ppr-types/${id}`, data)
  return unwrapApiResponse<PprType>(response)
}

export async function deletePprType(id: string): Promise<void> {
  await api.delete(`/ppr-types/${id}`)
}
