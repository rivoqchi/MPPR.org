import axios from 'axios'
import { ensureValidAccessToken } from '@/shared/lib/ensure-access-token'
import { fetchApplications } from '@/shared/api/applications-api'
import { fetchAppRoles } from '@/shared/api/app-roles-api'
import { fetchObjects } from '@/shared/api/objects-api'
import { fetchPprTypes } from '@/shared/api/ppr-types-api'
import { fetchStructuralUnits } from '@/shared/api/structural-units-api'
import { fetchUsers } from '@/shared/api/users-api'
import type { RealtimeEntity } from '@/shared/api/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'

interface HydrateOptions {
  force?: boolean
}

let hydratePromise: Promise<void> | null = null
let sessionHydrated = false

const entitySyncTimers = new Map<RealtimeEntity, ReturnType<typeof setTimeout>>()
const ENTITY_SYNC_DEBOUNCE_MS = 500

function isRateLimitError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 429
}

function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

async function settleStoreSync<T>(
  task: Promise<T>,
  apply: (value: T) => void,
  onFailure?: () => void,
): Promise<unknown | null> {
  try {
    const value = await task
    apply(value)
    return null
  } catch (error) {
    onFailure?.()
    return error
  }
}

export function isAppDataHydrated(): boolean {
  return sessionHydrated
}

export function resetAppDataSession(): void {
  sessionHydrated = false
  hydratePromise = null
  entitySyncTimers.forEach((timer) => clearTimeout(timer))
  entitySyncTimers.clear()
  useRolesStore.setState({ roles: [], isHydrated: false })
}

export async function hydrateAllStores(options?: HydrateOptions): Promise<void> {
  if (sessionHydrated && !options?.force) {
    return
  }

  if (hydratePromise) {
    return hydratePromise
  }

  hydratePromise = hydrateAllStoresInternal().finally(() => {
    hydratePromise = null
  })

  return hydratePromise
}

async function hydrateAllStoresInternal(): Promise<void> {
  const accessToken = await ensureValidAccessToken()

  if (!accessToken) {
    return
  }

  const errors = await Promise.all([
    settleStoreSync(fetchUsers(), (users) => useUsersStore.getState().setUsers(users)),
    settleStoreSync(fetchAppRoles(), (roles) => useRolesStore.getState().setRoles(roles), () =>
      useRolesStore.setState({ isHydrated: true }),
    ),
    settleStoreSync(fetchStructuralUnits(), (structuralUnits) =>
      useStructuralUnitsStore.getState().setStructuralUnits(structuralUnits),
    ),
    settleStoreSync(fetchObjects(), (objects) => useObjectsStore.getState().setObjects(objects)),
    settleStoreSync(fetchPprTypes(), (pprTypes) => usePprTypesStore.getState().setPprTypes(pprTypes)),
    settleStoreSync(fetchApplications(), (applications) =>
      useApplicationsStore.getState().setApplications(applications),
    ),
  ])

  const blockingError = errors.find(
    (error) =>
      error !== null && !isRateLimitError(error) && !isUnauthorizedError(error),
  )

  if (blockingError) {
    throw blockingError
  }

  sessionHydrated = true
}

async function syncEntityNow(entity: RealtimeEntity): Promise<void> {
  switch (entity) {
    case 'users': {
      const users = await fetchUsers()
      useUsersStore.getState().setUsers(users)
      break
    }
    case 'app-roles': {
      const roles = await fetchAppRoles()
      useRolesStore.getState().setRoles(roles)
      break
    }
    case 'structural-units': {
      const structuralUnits = await fetchStructuralUnits()
      useStructuralUnitsStore.getState().setStructuralUnits(structuralUnits)
      break
    }
    case 'objects': {
      const objects = await fetchObjects()
      useObjectsStore.getState().setObjects(objects)
      break
    }
    case 'ppr-types': {
      const pprTypes = await fetchPprTypes()
      usePprTypesStore.getState().setPprTypes(pprTypes)
      break
    }
    case 'applications': {
      const applications = await fetchApplications()
      useApplicationsStore.getState().setApplications(applications)
      break
    }
    default:
      break
  }
}

export function syncEntity(entity: RealtimeEntity): void {
  const existingTimer = entitySyncTimers.get(entity)

  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  entitySyncTimers.set(
    entity,
    setTimeout(() => {
      entitySyncTimers.delete(entity)
      void syncEntityNow(entity).catch(() => {
        // Realtime sync is best-effort; UI already has the last hydrated snapshot.
      })
    }, ENTITY_SYNC_DEBOUNCE_MS),
  )
}

export async function hydrateApplicationsStore(): Promise<void> {
  await useApplicationsStore.getState().hydrate()
}

