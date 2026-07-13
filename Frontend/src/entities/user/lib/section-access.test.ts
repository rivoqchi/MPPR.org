import { describe, expect, it } from 'vitest'
import type { User } from '@/entities/user/model/types'
import {
  filterSectionsForUserAccess,
  getSectionSelectionValue,
  parseSectionSelection,
  SECTIONLESS_ACCESS_VALUE,
} from '@/entities/user/lib/section-access'

const baseUser: User = {
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
}

const sections = [
  { id: 's1', originalName: 'Section 1' },
  { id: 's2', originalName: 'Section 2' },
]

describe('section access', () => {
  it('parses sectionless selection', () => {
    expect(parseSectionSelection(SECTIONLESS_ACCESS_VALUE)).toEqual({
      withoutSectionAccess: true,
      structuralUnitSectionId: undefined,
    })
  })

  it('parses specific section selection', () => {
    expect(parseSectionSelection('s1')).toEqual({
      withoutSectionAccess: false,
      structuralUnitSectionId: 's1',
    })
  })

  it('maps user to sectionless selection value', () => {
    expect(
      getSectionSelectionValue({
        ...baseUser,
        withoutSectionAccess: true,
      }),
    ).toBe(SECTIONLESS_ACCESS_VALUE)
  })

  it('shows all sections for sectionless user in same unit', () => {
    const user: User = {
      ...baseUser,
      withoutSectionAccess: true,
    }

    expect(filterSectionsForUserAccess(sections, user, 'unit-a')).toHaveLength(2)
  })

  it('shows only assigned section for section-specific user', () => {
    const user: User = {
      ...baseUser,
      withoutSectionAccess: false,
      structuralUnitSectionId: 's2',
    }

    expect(filterSectionsForUserAccess(sections, user, 'unit-a')).toEqual([
      { id: 's2', originalName: 'Section 2' },
    ])
  })

  it('shows all sections when canViewAll is enabled', () => {
    const user: User = {
      ...baseUser,
      withoutSectionAccess: false,
      structuralUnitSectionId: 's2',
    }

    expect(filterSectionsForUserAccess(sections, user, 'unit-a', true)).toHaveLength(2)
  })
})
