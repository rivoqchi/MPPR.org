import { describe, expect, it } from 'vitest'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import {
  applyStructuralUnitFilters,
  getStructuralUnitFilterOptions,
} from '@/features/structural-unit/lib/filter-structural-units'

const sampleUnits: StructuralUnit[] = [
  {
    id: '1',
    originalName: 'Axborot texnologiyalari xizmati',
    shortName: 'ATX',
    headFullName: 'Karimov Vali Aliyevich',
    documents: [],
    sections: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    originalName: 'Moliya va hisob xizmati',
    shortName: 'MHX',
    headFullName: 'Sodiqov Jasur Rustamovich',
    documents: [],
    sections: [],
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
]

describe('applyStructuralUnitFilters', () => {
  it('filters by search across text fields', () => {
    const result = applyStructuralUnitFilters(sampleUnits, { search: 'karimov' })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('1')
  })

  it('filters by short name', () => {
    const result = applyStructuralUnitFilters(sampleUnits, { shortName: 'MHX' })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('2')
  })

  it('filters by original name', () => {
    const result = applyStructuralUnitFilters(sampleUnits, {
      originalName: 'Axborot texnologiyalari xizmati',
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('1')
  })
})

describe('getStructuralUnitFilterOptions', () => {
  it('returns unique sorted filter options', () => {
    const options = getStructuralUnitFilterOptions(sampleUnits)

    expect(options.shortNames).toEqual([
      { value: 'ATX', label: 'ATX' },
      { value: 'MHX', label: 'MHX' },
    ])
    expect(options.originalNames).toHaveLength(2)
  })
})
