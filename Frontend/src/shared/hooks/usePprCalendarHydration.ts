import { useObjectsStore } from '@/entities/object/model/objects-store'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'

export function usePprCalendarHydration(): boolean {
  const isPprTypesHydrated = usePprTypesStore((state) => state.isHydrated)
  const isObjectsHydrated = useObjectsStore((state) => state.isHydrated)
  const isStructuralUnitsHydrated = useStructuralUnitsStore((state) => state.isHydrated)
  const isUsersHydrated = useUsersStore((state) => state.isHydrated)

  return isPprTypesHydrated && isObjectsHydrated && isStructuralUnitsHydrated && isUsersHydrated
}
