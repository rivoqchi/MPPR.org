import { describe, expect, it } from 'vitest'
import type { User } from '@/entities/user/model/types'
import { filterUsers } from '@/features/users/lib/filter-users'

const sampleUsers: User[] = [
  {
    id: '1',
    firstName: 'Islomjon',
    lastName: 'Anvarov',
    birthDate: '2000-01-01',
    phone: '+998901234567',
    position: '1-toifali muhandis dasturchi',
    roleId: 'role-1',
    structuralUnitId: 'unit-a',
    password: '4567',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    firstName: 'Sardorbek',
    lastName: 'Turdimurodov',
    birthDate: '1999-05-05',
    phone: '+998907654321',
    position: 'Muhandis Elektronchi',
    roleId: 'role-1',
    structuralUnitId: 'unit-a',
    password: '4321',
    isActive: true,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
]

describe('filterUsers', () => {
  it('returns all users when search is empty', () => {
    expect(filterUsers(sampleUsers, '')).toHaveLength(2)
  })

  it('filters by name', () => {
    expect(filterUsers(sampleUsers, 'islomjon')).toHaveLength(1)
    expect(filterUsers(sampleUsers, 'islomjon')[0]?.id).toBe('1')
  })

  it('filters by position', () => {
    expect(filterUsers(sampleUsers, 'elektronchi')).toHaveLength(1)
    expect(filterUsers(sampleUsers, 'elektronchi')[0]?.id).toBe('2')
  })
})
