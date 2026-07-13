import { create } from 'zustand'
import {
  changeUserPassword as changeUserPasswordApi,
  createUser as createUserApi,
  deleteUser as deleteUserApi,
  fetchUsers,
  setUserActive as setUserActiveApi,
  updateUser as updateUserApi,
  updateUserProfile as updateUserProfileApi,
} from '@/shared/api/users-api'
import {
  syncCurrentUserFromUsers,
  syncCurrentUserIfMatches,
} from '@/entities/user/lib/sync-current-user'
import type { User, UserFormValues } from '@/entities/user/model/types'

export interface ProfileUpdateValues {
  firstName: string
  lastName: string
  birthDate: string
  position: string
  avatar?: string
}

interface UsersState {
  users: User[]
  isHydrated: boolean
  setUsers: (users: User[]) => void
  hydrate: () => Promise<void>
  addUser: (data: UserFormValues) => Promise<User>
  updateUser: (id: string, data: UserFormValues) => Promise<User | null>
  updateProfile: (id: string, data: ProfileUpdateValues) => Promise<User | null>
  changePassword: (id: string, password: string) => Promise<User>
  setUserActive: (id: string, isActive: boolean) => Promise<User>
  removeUser: (id: string) => Promise<boolean>
}

export const useUsersStore = create<UsersState>()((set, get) => ({
  users: [],
  isHydrated: false,
  setUsers: (users) => {
    set({ users, isHydrated: true })
    syncCurrentUserFromUsers(users)
  },
  hydrate: async () => {
    const users = await fetchUsers()
    get().setUsers(users)
  },
  addUser: async (data) => {
    const user = await createUserApi(data)
    set({ users: [...get().users, user] })
    return user
  },
  updateUser: async (id, data) => {
    const user = await updateUserApi(id, data)
    set({
      users: get().users.map((item) => (item.id === id ? user : item)),
    })
    syncCurrentUserIfMatches(user)
    return user
  },
  updateProfile: async (id, data) => {
    const user = await updateUserProfileApi(id, data)
    set({
      users: get().users.map((item) => (item.id === id ? user : item)),
    })
    syncCurrentUserIfMatches(user)
    return user
  },
  changePassword: async (id, password) => {
    const user = await changeUserPasswordApi(id, password)
    set({
      users: get().users.map((item) => (item.id === id ? user : item)),
    })
    syncCurrentUserIfMatches(user)
    return user
  },
  setUserActive: async (id, isActive) => {
    const user = await setUserActiveApi(id, isActive)
    set({
      users: get().users.map((item) => (item.id === id ? user : item)),
    })
    syncCurrentUserIfMatches(user)
    return user
  },
  removeUser: async (id) => {
    await deleteUserApi(id)
    set({ users: get().users.filter((user) => user.id !== id) })
    return true
  },
}))
