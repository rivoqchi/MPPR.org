import { getUserFullName } from '@/entities/user/lib/user-display'
import type { User } from '@/entities/user/model/types'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'

export interface RecipientUserSelectOption {
  value: string
  label: string
  searchText: string
}

export interface RecipientUserSelectGroup {
  label: string
  options: RecipientUserSelectOption[]
}

export function buildRecipientUserSelectGroups(params: {
  users: User[]
  structuralUnits: StructuralUnit[]
  excludeUserIds?: string[]
}): RecipientUserSelectGroup[] {
  const excluded = new Set(params.excludeUserIds ?? [])

  const unitsById = new Map(
    params.structuralUnits.map((unit) => [unit.id, unit] as const),
  )

  const usersByUnit = new Map<string, User[]>()

  for (const user of params.users) {
    if (user.isActive === false || excluded.has(user.id) || !user.structuralUnitId) {
      continue
    }

    const list = usersByUnit.get(user.structuralUnitId) ?? []
    list.push(user)
    usersByUnit.set(user.structuralUnitId, list)
  }

  const orderedUnitIds = [
    ...params.structuralUnits
      .map((unit) => unit.id)
      .filter((unitId) => usersByUnit.has(unitId)),
    ...[...usersByUnit.keys()].filter((unitId) => !unitsById.has(unitId)),
  ]

  return orderedUnitIds
    .map((unitId) => {
      const unit = unitsById.get(unitId)
      const unitUsers = usersByUnit.get(unitId) ?? []

      const options = unitUsers
        .slice()
        .sort((left, right) => getUserFullName(left).localeCompare(getUserFullName(right), 'uz'))
        .map((user) => {
          const fullName = getUserFullName(user)

          return {
            value: user.id,
            label: user.position ? `${fullName} · ${user.position}` : fullName,
            searchText: [fullName, user.position, user.phone, user.tabelNumber]
              .join(' ')
              .toLowerCase(),
          }
        })

      return {
        label: unit ? unit.shortName || unit.originalName : unitId,
        options,
      }
    })
    .filter((group) => group.options.length > 0)
}

export function filterRecipientUserSelectOption(
  input: string,
  option?: RecipientUserSelectOption,
): boolean {
  if (!option) {
    return false
  }

  return option.searchText.includes(input.trim().toLowerCase())
}

export function deriveStructuralUnitIdsFromRecipients(
  recipientUserIds: string[],
  users: User[],
): string[] {
  const unitIds = new Set<string>()

  for (const userId of recipientUserIds) {
    const user = users.find((item) => item.id === userId)

    if (user?.structuralUnitId) {
      unitIds.add(user.structuralUnitId)
    }
  }

  return [...unitIds]
}
