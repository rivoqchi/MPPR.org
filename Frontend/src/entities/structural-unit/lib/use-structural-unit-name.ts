import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'

export function formatStructuralUnitLabel(
  unit?: Pick<StructuralUnit, 'originalName' | 'shortName'> | null,
  fallback = '—',
): string {
  if (!unit) {
    return fallback
  }

  if (unit.shortName) {
    return `${unit.originalName} (${unit.shortName})`
  }

  return unit.originalName
}

export function useStructuralUnitName(structuralUnitId?: string): string {
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const structuralUnit = structuralUnits.find((item) => item.id === structuralUnitId)

  return formatStructuralUnitLabel(structuralUnit, structuralUnitId ?? '—')
}
