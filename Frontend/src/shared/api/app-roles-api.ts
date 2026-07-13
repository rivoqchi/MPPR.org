import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import { normalizeRole } from '@/entities/role/lib/normalize-role'
import type { Role, RoleFormValues } from '@/entities/role/model/types'

export async function fetchAppRoles(): Promise<Role[]> {
  const response = await api.get('/app-roles')
  const roles = unwrapApiResponse<Role[]>(response)
  return roles.map(normalizeRole)
}

export async function createAppRole(data: RoleFormValues): Promise<Role> {
  const response = await api.post('/app-roles', data)
  return normalizeRole(unwrapApiResponse<Role>(response))
}

export async function updateAppRole(id: string, data: RoleFormValues): Promise<Role> {
  const response = await api.patch(`/app-roles/${id}`, data)
  return normalizeRole(unwrapApiResponse<Role>(response))
}

export async function deleteAppRole(id: string): Promise<void> {
  await api.delete(`/app-roles/${id}`)
}
