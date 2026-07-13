import { useEffect } from 'react'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { waitForAuthStoreHydration } from '@/shared/lib/auth-session'
import { hydrateAllStores } from '@/shared/lib/realtime/sync-app-data'

export function useRolesHydration(): boolean {
  const isHydrated = useRolesStore((state) => state.isHydrated)

  useEffect(() => {
    if (isHydrated) {
      return
    }

    let isActive = true

    void (async () => {
      await waitForAuthStoreHydration()

      if (!isActive || useRolesStore.getState().isHydrated) {
        return
      }

      try {
        await hydrateAllStores()
      } finally {
        if (!isActive) {
          return
        }

        if (!useRolesStore.getState().isHydrated) {
          useRolesStore.setState({ isHydrated: true })
        }
      }
    })()

    return () => {
      isActive = false
    }
  }, [isHydrated])

  return isHydrated
}
