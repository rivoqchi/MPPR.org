import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import type { User } from '@/entities/user/model/types'

export function useUserSectionAssignmentLabel(user?: User) {
  const { t } = useTranslation()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

  return useMemo(() => {
    if (!user?.structuralUnitId) {
      return undefined
    }

    const unit = structuralUnits.find((item) => item.id === user.structuralUnitId)
    const sections = unit?.sections ?? []

    if (sections.length === 0) {
      return undefined
    }

    if (user.withoutSectionAccess) {
      return t('users.sectionAssignment.sectionless')
    }

    const section = sections.find((item) => item.id === user.structuralUnitSectionId)

    if (!section) {
      return t('users.sectionAssignment.unknown')
    }

    return `${section.originalName} (${section.shortName})`
  }, [structuralUnits, t, user])
}
