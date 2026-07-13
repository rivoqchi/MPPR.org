import { describe, expect, it } from 'vitest'
import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'
import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  generateUserPassword,
} from '@/entities/user/lib/generate-password'

describe('generateUserPassword', () => {
  it('uses last 4 digits of phone as password', () => {
    expect(generateUserPassword('+998 90 123 45 67', 'role-1')).toBe('4567')
  })

  it('uses special password for admin with configured phone', () => {
    expect(generateUserPassword('+998 94 793 20 05', SYSTEM_ADMIN_ROLE_ID)).toBe(ADMIN_PASSWORD)
    expect(ADMIN_PASSWORD).toBe('123123')
    expect(ADMIN_PHONE).toBe('998947932005')
  })

  it('uses last 4 digits for admin role with other phones', () => {
    expect(generateUserPassword('+998 90 111 22 33', SYSTEM_ADMIN_ROLE_ID)).toBe('2233')
  })
})
