import { useAuthStore } from '@/entities/user/model/auth-store'
import { clearTokens, getAccessToken } from '@/shared/lib/token-storage'

export function hasAuthStoreHydrated(): boolean {
  return useAuthStore.persist.hasHydrated()
}

export function waitForAuthStoreHydration(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    useAuthStore.persist.onFinishHydration(() => resolve())
  })
}

export function hasAuthSession(): boolean {
  return Boolean(useAuthStore.getState().currentUser && getAccessToken())
}

export function syncAuthSession(): void {
  if (!hasAuthStoreHydrated()) {
    return
  }

  const currentUser = useAuthStore.getState().currentUser
  const accessToken = getAccessToken()

  if (currentUser && !accessToken) {
    useAuthStore.getState().logout()
  }

  if (!currentUser && accessToken) {
    clearTokens()
  }
}
