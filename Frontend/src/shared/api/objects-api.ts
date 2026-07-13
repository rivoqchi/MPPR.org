import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type { ObjectFormValues, RegisteredObject } from '@/entities/object/model/types'

export async function fetchObjects(): Promise<RegisteredObject[]> {
  const response = await api.get('/objects')
  return unwrapApiResponse<RegisteredObject[]>(response)
}

export async function createObject(data: ObjectFormValues): Promise<RegisteredObject> {
  const response = await api.post('/objects', data)
  return unwrapApiResponse<RegisteredObject>(response)
}

export async function updateObject(
  id: string,
  data: ObjectFormValues,
): Promise<RegisteredObject> {
  const response = await api.patch(`/objects/${id}`, data)
  return unwrapApiResponse<RegisteredObject>(response)
}

export async function deleteObject(id: string): Promise<void> {
  await api.delete(`/objects/${id}`)
}
