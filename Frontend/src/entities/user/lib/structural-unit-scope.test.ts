import { describe, expect, it } from 'vitest'
import { createSystemAdminRole } from '@/entities/role/lib/default-roles'
import type { User } from '@/entities/user/model/types'
import {
  canViewAllStructuralUnits,
  filterByStructuralUnitScope,
  filterUsersByStructuralUnitScope,
} from '@/entities/user/lib/structural-unit-scope'

const users: User[] = [
  {
    id: 'u1',
    firstName: 'A',
    lastName: 'One',
    birthDate: '2000-01-01',
    phone: '+998901111111',
    position: 'Engineer',
    roleId: 'role-1',
    structuralUnitId: 'unit-a',
    password: '1111',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'u2',
    firstName: 'B',
    lastName: 'Two',
    birthDate: '2000-01-01',
    phone: '+998902222222',
    position: 'Engineer',
    roleId: 'role-1',
    structuralUnitId: 'unit-b',
    password: '2222',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

describe('structural unit scope', () => {
  it('allows system admin to view all units', () => {
    expect(canViewAllStructuralUnits(createSystemAdminRole())).toBe(true)
  })

  it('allows custom role with canViewAllStructuralUnits flag', () => {
    expect(
      canViewAllStructuralUnits({
        ...createSystemAdminRole(),
        id: 'monitoring-role',
        isSystem: false,
        canViewAllStructuralUnits: true,
      }),
    ).toBe(true)
  })

  it('filters users by structural unit', () => {
    const scoped = filterUsersByStructuralUnitScope(users, users[0]!, false)

    expect(scoped).toHaveLength(1)
    expect(scoped[0]?.id).toBe('u1')
  })

  it('returns all users for monitoring scope', () => {
    expect(filterUsersByStructuralUnitScope(users, users[0]!, true)).toHaveLength(2)
  })

  it('filters created records by owner structural unit', () => {
    const items = [
      { id: '1', createdByUserId: 'u1' },
      { id: '2', createdByUserId: 'u2' },
    ]

    const scoped = filterByStructuralUnitScope(
      items,
      (item) => item.createdByUserId,
      users[0]!,
      users,
      false,
    )

    expect(scoped.map((item) => item.id)).toEqual(['1'])
  })
})
