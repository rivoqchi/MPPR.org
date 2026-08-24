import { getUserFullName } from '@/entities/user/lib/user-display'
import type { User } from '@/entities/user/model/types'
import type { StructuralUnit, StructuralUnitSection } from '@/entities/structural-unit/model/types'

export interface HeadUserSelectOption {
  value: string
  label: string
  searchText: string
}

export function buildHeadUserSelectOptions(users: User[]): HeadUserSelectOption[] {
  return users
    .filter((user) => user.isActive !== false)
    .map((user) => {
      const fullName = getUserFullName(user)

      return {
        value: user.id,
        label: `${fullName} · ${user.phone}`,
        searchText: [fullName, user.phone, user.position, user.tabelNumber].join(' ').toLowerCase(),
      }
    })
}

export function resolveStructuralUnitHeadUserId(
  structuralUnit: Pick<StructuralUnit, 'headUserId' | 'headFullName'>,
  users: User[],
): string | undefined {
  if (structuralUnit.headUserId) {
    return structuralUnit.headUserId
  }

  const match = users.find((user) => getUserFullName(user) === structuralUnit.headFullName)

  return match?.id
}

export function resolveSectionHeadUserId(
  section: Pick<StructuralUnitSection, 'headUserId' | 'headFullName'>,
  users: User[],
): string | undefined {
  if (section.headUserId) {
    return section.headUserId
  }

  if (!section.headFullName?.trim()) {
    return undefined
  }

  const match = users.find((user) => getUserFullName(user) === section.headFullName)

  return match?.id
}

export function resolveHeadFullName(headUserId: string | undefined, users: User[]): string {
  if (!headUserId) {
    return ''
  }

  const user = users.find((item) => item.id === headUserId)

  return user ? getUserFullName(user) : ''
}

export function filterHeadUserSelectOption(input: string, option?: HeadUserSelectOption): boolean {
  if (!option) {
    return false
  }

  return option.searchText.includes(input.trim().toLowerCase())
}
