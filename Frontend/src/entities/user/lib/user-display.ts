import type { User } from '@/entities/user/model/types'

export function getUserFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function getUserInitials(user: Pick<User, 'firstName' | 'lastName'>): string {
  const first = user.firstName.trim().charAt(0)
  const last = user.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || '?'
}
