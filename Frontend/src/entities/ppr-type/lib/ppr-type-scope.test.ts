import { describe, expect, it } from 'vitest'
import type { PprType } from '@/entities/ppr-type/model/types'
import type { User } from '@/entities/user/model/types'
import {
  filterPprTypesForUser,
  filterPprTypesForViewScope,
  isPprTypeVisibleToUser,
} from '@/entities/ppr-type/lib/ppr-type-scope'

const baseUser: User = {
  id: 'u1',
  firstName: 'A',
  lastName: 'One',
  birthDate: '2000-01-01',
  phone: '+998901111111',
  tabelNumber: '1001',
  position: 'Engineer',
  roleId: 'role-1',
  structuralUnitId: 'unit-a',
  password: '1111',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const structurePpr: PprType = {
  id: 'p1',
  originalName: 'Structure PPR',
  shortName: 'PPR1',
  description: 'desc',
  files: [],
  structuralUnitId: 'unit-a',
  scopeType: 'structure',
  sectionId: '',
  createdByUserId: 'u-structure',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const sectionPpr: PprType = {
  ...structurePpr,
  id: 'p2',
  originalName: 'Section PPR',
  shortName: 'PPR2',
  scopeType: 'section',
  sectionId: 's1',
  createdByUserId: 'u-section',
}

const users: User[] = [
  {
    ...baseUser,
    id: 'u-structure',
    withoutSectionAccess: true,
  },
  {
    ...baseUser,
    id: 'u-section',
    withoutSectionAccess: false,
    structuralUnitSectionId: 's1',
  },
]

describe('ppr type scope visibility', () => {
  it('shows structure ppr only to sectionless users in same unit', () => {
    const structureUser: User = { ...baseUser, withoutSectionAccess: true }

    expect(isPprTypeVisibleToUser(structurePpr, structureUser, users, false)).toBe(true)
    expect(
      isPprTypeVisibleToUser(structurePpr, {
        ...baseUser,
        withoutSectionAccess: false,
        structuralUnitSectionId: 's1',
      }, users, false),
    ).toBe(false)
  })

  it('shows section ppr to users in the same section', () => {
    const sectionUser: User = {
      ...baseUser,
      withoutSectionAccess: false,
      structuralUnitSectionId: 's1',
    }

    expect(isPprTypeVisibleToUser(sectionPpr, sectionUser, users, false)).toBe(true)
    expect(
      isPprTypeVisibleToUser(sectionPpr, {
        ...baseUser,
        withoutSectionAccess: false,
        structuralUnitSectionId: 's2',
      }, users, false),
    ).toBe(false)
    expect(isPprTypeVisibleToUser(sectionPpr, { ...baseUser, withoutSectionAccess: true }, users, false)).toBe(
      false,
    )
  })

  it('filters list for section user', () => {
    const sectionUser: User = {
      ...baseUser,
      withoutSectionAccess: false,
      structuralUnitSectionId: 's1',
    }

    expect(filterPprTypesForUser([structurePpr, sectionPpr], sectionUser, users, false)).toEqual([
      sectionPpr,
    ])
  })

  it('filters by calendar view scope', () => {
    expect(
      filterPprTypesForViewScope(
        [structurePpr, sectionPpr],
        { type: 'section', sectionId: 's1' },
        'unit-a',
        users,
      ),
    ).toEqual([sectionPpr])
  })
})
