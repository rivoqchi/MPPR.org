import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AntComponentSize, AppLocale, SidebarPosition, ThemeMode } from '@/shared/types'
import { DEFAULT_ANT_COMPONENT_SIZE, DEFAULT_SIDEBAR_POSITION } from '@/shared/lib/constants'

interface UiState {
  theme: ThemeMode
  locale: AppLocale
  sidebarCollapsed: boolean
  sidebarPosition: SidebarPosition
  componentSize: AntComponentSize
  browserNotificationsEnabled: boolean
  autoMarkNotificationsAsRead: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLocale: (locale: AppLocale) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarPosition: (position: SidebarPosition) => void
  setComponentSize: (size: AntComponentSize) => void
  setBrowserNotificationsEnabled: (enabled: boolean) => void
  setAutoMarkNotificationsAsRead: (enabled: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      locale: 'uz',
      sidebarCollapsed: false,
      sidebarPosition: DEFAULT_SIDEBAR_POSITION,
      componentSize: DEFAULT_ANT_COMPONENT_SIZE,
      browserNotificationsEnabled: false,
      autoMarkNotificationsAsRead: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setLocale: (locale) => set({ locale }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setSidebarPosition: (sidebarPosition) => set({ sidebarPosition }),
      setComponentSize: (componentSize) => set({ componentSize }),
      setBrowserNotificationsEnabled: (browserNotificationsEnabled) =>
        set({ browserNotificationsEnabled }),
      setAutoMarkNotificationsAsRead: (autoMarkNotificationsAsRead) =>
        set({ autoMarkNotificationsAsRead }),
    }),
    {
      name: 'ppr-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarPosition: state.sidebarPosition,
        componentSize: state.componentSize,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
        autoMarkNotificationsAsRead: state.autoMarkNotificationsAsRead,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(typeof persistedState === 'object' && persistedState !== null ? persistedState : {}),
        componentSize:
          (persistedState as Partial<UiState> | undefined)?.componentSize ??
          DEFAULT_ANT_COMPONENT_SIZE,
        sidebarPosition:
          (persistedState as Partial<UiState> | undefined)?.sidebarPosition ??
          DEFAULT_SIDEBAR_POSITION,
      }),
    },
  ),
)
