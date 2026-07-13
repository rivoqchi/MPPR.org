import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type { User } from '@/entities/user/model/types'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface PhoneLoginResponse extends AuthTokens {
  user: Omit<User, 'password'>
}

export async function loginWithPhone(phone: string, password: string): Promise<PhoneLoginResponse> {
  const response = await api.post('/auth/login-phone', { phone, password })
  return unwrapApiResponse<PhoneLoginResponse>(response)
}

export async function logoutFromApi(): Promise<void> {
  await api.post('/auth/logout')
}
