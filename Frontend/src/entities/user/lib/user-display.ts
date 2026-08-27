import type { User } from '@/entities/user/model/types'

export function getUserFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim()
}

/** Short header form: "I. Anvarov" */
export function getUserShortName(user: Pick<User, 'firstName' | 'lastName'>): string {
  const first = user.firstName.trim()
  const last = user.lastName.trim()
  if (!first && !last) {
    return '?'
  }
  if (!first) {
    return last
  }
  if (!last) {
    return `${first.charAt(0).toUpperCase()}.`
  }
  return `${first.charAt(0).toUpperCase()}. ${last}`
}

export function getUserInitials(user: Pick<User, 'firstName' | 'lastName'>): string {
  const first = user.firstName.trim().charAt(0)
  const last = user.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || '?'
}
