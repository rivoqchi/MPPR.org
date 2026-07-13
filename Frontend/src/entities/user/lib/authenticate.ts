import { DEFAULT_ADMIN } from '@/entities/user/lib/default-admin'
import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  normalizePhone,
} from '@/entities/user/lib/generate-password'
import type { User } from '@/entities/user/model/types'

export function authenticateUser(
  phone: string,
  password: string,
  users: User[],
): User | null {
  const normalizedPhone = normalizePhone(phone)

  if (normalizedPhone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
    return DEFAULT_ADMIN
  }

  const matchedUser = users.find(
    (user) => normalizePhone(user.phone) === normalizedPhone,
  )

  if (matchedUser && matchedUser.password === password) {
    return matchedUser
  }

  return null
}
