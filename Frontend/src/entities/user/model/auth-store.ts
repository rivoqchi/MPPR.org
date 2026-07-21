import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/entities/user/model/types'
import { getAccessToken } from '@/shared/lib/token-storage'

interface AuthState {
  currentUser: User | null
  login: (user: User) => void
  logout: () => void
  updateCurrentUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      updateCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: 'mppr-auth-store',
    },
  ),
)

export function selectIsAuthenticated(state: AuthState): boolean {
  return state.currentUser !== null && state.currentUser.isActive !== false && Boolean(getAccessToken())
}
