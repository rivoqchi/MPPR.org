import { useEffect } from 'react'
import { NetworkOfflineOverlay } from '@/features/network/ui/NetworkOfflineOverlay'
import { useNetworkStore } from '@/shared/lib/network/network-store'

export function NetworkStatusProvider() {
  useEffect(() => {
    const handleOffline = () => {
      useNetworkStore.getState().setOffline()
    }

    const handleOnline = () => {
      void useNetworkStore.getState().recheck()
    }

    if (!navigator.onLine) {
      useNetworkStore.getState().setOffline()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return <NetworkOfflineOverlay />
}
