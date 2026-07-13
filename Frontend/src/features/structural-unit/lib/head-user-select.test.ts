import { describe, expect, it } from 'vitest'
import {
  buildHeadUserSelectOptions,
  resolveStructuralUnitHeadUserId,
} from '@/features/structural-unit/lib/head-user-select'
import type { User } from '@/entities/user/model/types'

const users: User[] = [
  {
    id: 'user-1',
    firstName: 'Vali',
    lastName: 'Karimov',
    birthDate: '1990-01-01',
    phone: '+998901112233',
    tabelNumber: '1001',
    position: 'Direktor',
    roleId: 'role-1',
    structuralUnitId: 'unit-1',
    password: 'secret',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('head user select', () => {
  it('builds searchable select options', () => {
    const options = buildHeadUserSelectOptions(users)

    expect(options[0]?.value).toBe('user-1')
    expect(options[0]?.label).toContain('Vali Karimov')
    expect(options[0]?.searchText).toContain('direktor')
  })

  it('resolves head user id from stored value or legacy full name', () => {
    expect(
      resolveStructuralUnitHeadUserId(
        { headUserId: 'user-1', headFullName: 'Vali Karimov' },
        users,
      ),
    ).toBe('user-1')

    expect(
      resolveStructuralUnitHeadUserId(
        { headFullName: 'Vali Karimov' },
        users,
      ),
    ).toBe('user-1')
  })
})
