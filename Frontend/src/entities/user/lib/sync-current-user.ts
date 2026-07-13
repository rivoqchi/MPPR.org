import { clearTokens } from '@/shared/lib/token-storage'
import { useAuthStore } from '@/entities/user/model/auth-store'
import type { User } from '@/entities/user/model/types'

function logoutInactiveUser(): void {
  clearTokens()
  useAuthStore.getState().logout()
}

export function syncCurrentUserFromUsers(users: User[]): void {
  const currentUser = useAuthStore.getState().currentUser
  if (!currentUser) {
    return
  }

  const freshUser = users.find((user) => user.id === currentUser.id)
  if (!freshUser) {
    return
  }

  if (freshUser.isActive === false) {
    logoutInactiveUser()
    return
  }

  useAuthStore.getState().updateCurrentUser({ ...freshUser, password: '' })
}

export function syncCurrentUserIfMatches(user: User): void {
  const currentUser = useAuthStore.getState().currentUser
  if (!currentUser || currentUser.id !== user.id) {
    return
  }

  if (user.isActive === false) {
    logoutInactiveUser()
    return
  }

  useAuthStore.getState().updateCurrentUser({ ...user, password: '' })
}
