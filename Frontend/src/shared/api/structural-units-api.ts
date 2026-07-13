import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  StructuralUnit,
  StructuralUnitFormValues,
  StructuralUnitPatchPayload,
} from '@/entities/structural-unit/model/types'

export async function fetchStructuralUnits(): Promise<StructuralUnit[]> {
  const response = await api.get('/structural-units')
  return unwrapApiResponse<StructuralUnit[]>(response)
}

export async function createStructuralUnit(
  data: StructuralUnitFormValues,
): Promise<StructuralUnit> {
  const response = await api.post('/structural-units', data)
  return unwrapApiResponse<StructuralUnit>(response)
}

export async function updateStructuralUnit(
  id: string,
  data: StructuralUnitPatchPayload,
): Promise<StructuralUnit> {
  const response = await api.patch(`/structural-units/${id}`, data)
  return unwrapApiResponse<StructuralUnit>(response)
}

export async function deleteStructuralUnit(id: string): Promise<void> {
  await api.delete(`/structural-units/${id}`)
}
