import { describe, expect, it } from 'vitest'
import { authenticateUser } from '@/entities/user/lib/authenticate'
import { DEFAULT_ADMIN } from '@/entities/user/lib/default-admin'
import type { User } from '@/entities/user/model/types'

const sampleUser: User = {
  id: 'user-1',
  firstName: 'Vali',
  lastName: 'Aliyev',
  birthDate: '1995-05-15',
  phone: '+998901234567',
  position: 'Mutaxassis',
  roleId: 'role-1',
  structuralUnitId: 'unit-a',
  password: '4567',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('authenticateUser', () => {
  it('authenticates default admin with phone and password', () => {
    const result = authenticateUser('+998 94 793 20 05', '123123', [])

    expect(result).toEqual(DEFAULT_ADMIN)
  })

  it('rejects invalid admin password', () => {
    expect(authenticateUser('+998947932005', 'wrong', [])).toBeNull()
  })

  it('authenticates user from store by phone and password', () => {
    const result = authenticateUser('+998 90 123 45 67', '4567', [sampleUser])

    expect(result).toEqual(sampleUser)
  })

  it('rejects wrong password for existing user', () => {
    expect(authenticateUser('+998901234567', '0000', [sampleUser])).toBeNull()
  })
})
