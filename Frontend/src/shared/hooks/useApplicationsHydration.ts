import { useApplicationsStore } from '@/entities/application/model/applications-store'

export function useApplicationsHydration() {
  return useApplicationsStore((state) => state.isHydrated)
}
