import { create } from 'zustand'
import {
  createAppRole,
  deleteAppRole,
  fetchAppRoles,
  updateAppRole,
} from '@/shared/api/app-roles-api'
import type { Role, RoleFormValues } from '@/entities/role/model/types'

interface RolesState {
  roles: Role[]
  isHydrated: boolean
  setRoles: (roles: Role[]) => void
  hydrate: () => Promise<void>
  addRole: (data: RoleFormValues) => Promise<Role>
  updateRole: (id: string, data: RoleFormValues) => Promise<Role | null>
  deleteRole: (id: string) => Promise<boolean>
}

export const useRolesStore = create<RolesState>()((set, get) => ({
  roles: [],
  isHydrated: false,
  setRoles: (roles) => set({ roles, isHydrated: true }),
  hydrate: async () => {
    const roles = await fetchAppRoles()
    set({ roles, isHydrated: true })
  },
  addRole: async (data) => {
    const role = await createAppRole(data)
    set({ roles: [...get().roles, role] })
    return role
  },
  updateRole: async (id, data) => {
    const role = await updateAppRole(id, data)
    set({
      roles: get().roles.map((item) => (item.id === id ? role : item)),
    })
    return role
  },
  deleteRole: async (id) => {
    const existing = get().roles.find((role) => role.id === id)

    if (!existing || existing.isSystem) {
      return false
    }

    await deleteAppRole(id)
    set({ roles: get().roles.filter((role) => role.id !== id) })
    return true
  },
}))
