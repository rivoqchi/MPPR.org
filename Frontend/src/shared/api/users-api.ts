import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import {
  toChangePasswordPayload,
  toCreateUserPayload,
  toSetUserActivePayload,
  toUpdateProfilePayload,
  toUpdateUserPayload,
} from '@/shared/api/user-payload'
import type { User, UserFormValues } from '@/entities/user/model/types'
import type { ProfileUpdateValues } from '@/entities/user/model/users-store'
import { generateUserPassword } from '@/entities/user/lib/generate-password'

type ApiUser = Omit<User, 'password'>

function toUser(apiUser: ApiUser): User {
  return {
    ...apiUser,
    password: '',
  }
}

export async function fetchUsers(): Promise<User[]> {
  const response = await api.get('/users')
  const users = unwrapApiResponse<ApiUser[]>(response)
  return users.map(toUser)
}

export async function createUser(data: UserFormValues): Promise<User> {
  const response = await api.post(
    '/users',
    toCreateUserPayload(data, generateUserPassword(data.phone, data.roleId)),
  )
  return toUser(unwrapApiResponse<ApiUser>(response))
}

export async function updateUser(id: string, data: UserFormValues): Promise<User> {
  const response = await api.patch(
    `/users/${id}`,
    toUpdateUserPayload(data, generateUserPassword(data.phone, data.roleId)),
  )
  return toUser(unwrapApiResponse<ApiUser>(response))
}

export async function updateUserProfile(id: string, data: ProfileUpdateValues): Promise<User> {
  const response = await api.patch(`/users/${id}`, toUpdateProfilePayload(data))
  return toUser(unwrapApiResponse<ApiUser>(response))
}

export async function changeUserPassword(id: string, password: string): Promise<User> {
  const response = await api.patch(`/users/${id}`, toChangePasswordPayload(password))
  return toUser(unwrapApiResponse<ApiUser>(response))
}

export async function setUserActive(id: string, isActive: boolean): Promise<User> {
  const response = await api.patch(`/users/${id}`, toSetUserActivePayload(isActive))
  return toUser(unwrapApiResponse<ApiUser>(response))
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}
