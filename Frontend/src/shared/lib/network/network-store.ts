import { create } from 'zustand'
import { checkServerConnection } from '@/shared/lib/network/check-connection'

interface NetworkState {
  isOffline: boolean
  isChecking: boolean
  setOffline: () => void
  setOnline: () => void
  recheck: () => Promise<boolean>
}

function getInitialOfflineState(): boolean {
  return typeof navigator !== 'undefined' ? !navigator.onLine : false
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOffline: getInitialOfflineState(),
  isChecking: false,
  setOffline: () => {
    if (!get().isOffline) {
      set({ isOffline: true })
    }
  },
  setOnline: () => {
    if (get().isOffline) {
      set({ isOffline: false })
    }
  },
  recheck: async () => {
    if (get().isChecking) {
      return !get().isOffline
    }

    set({ isChecking: true })

    const isOnline = await checkServerConnection()

    set({ isOffline: !isOnline, isChecking: false })

    return isOnline
  },
}))
