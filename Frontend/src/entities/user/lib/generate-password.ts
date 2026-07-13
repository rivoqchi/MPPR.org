import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'

export const ADMIN_PHONE = '998947932005'
export const ADMIN_PASSWORD = '123123'

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function generateUserPassword(phone: string, roleId: string): string {
  const normalizedPhone = normalizePhone(phone)

  if (roleId === SYSTEM_ADMIN_ROLE_ID && normalizedPhone === ADMIN_PHONE) {
    return ADMIN_PASSWORD
  }

  const digits = normalizedPhone

  if (digits.length < 4) {
    return digits.padStart(4, '0')
  }

  return digits.slice(-4)
}
