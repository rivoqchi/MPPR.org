import { getUserFullName } from '@/entities/user/lib/user-display'
import type { User } from '@/entities/user/model/types'

export function filterUsers(users: User[], search: string): User[] {
  const normalizedSearch = search.trim().toLowerCase()

  if (!normalizedSearch) {
    return users
  }

  return users.filter((user) => {
    const haystack = [
      user.firstName,
      user.lastName,
      getUserFullName(user),
      user.position,
      user.phone,
      user.tabelNumber,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedSearch)
  })
}
