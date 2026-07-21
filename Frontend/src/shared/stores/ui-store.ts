import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_UI_COLOR_PRESETS,
  type UiSemanticColorKey,
} from '@/shared/lib/theme-colors'
import type {
  AntComponentSize,
  AppLocale,
  SidebarPosition,
  ThemeMode,
  UiColorPreset,
} from '@/shared/types'
import { DEFAULT_ANT_COMPONENT_SIZE, DEFAULT_SIDEBAR_POSITION } from '@/shared/lib/constants'

interface UiState {
  theme: ThemeMode
  locale: AppLocale
  sidebarCollapsed: boolean
  sidebarPosition: SidebarPosition
  componentSize: AntComponentSize
  primaryColorPreset: UiColorPreset
  successColorPreset: UiColorPreset
  warningColorPreset: UiColorPreset
  errorColorPreset: UiColorPreset
  browserNotificationsEnabled: boolean
  autoMarkNotificationsAsRead: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLocale: (locale: AppLocale) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarPosition: (position: SidebarPosition) => void
  setComponentSize: (size: AntComponentSize) => void
  setColorPreset: (key: UiSemanticColorKey, color: UiColorPreset) => void
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
      primaryColorPreset: DEFAULT_UI_COLOR_PRESETS.primary,
      successColorPreset: DEFAULT_UI_COLOR_PRESETS.success,
      warningColorPreset: DEFAULT_UI_COLOR_PRESETS.warning,
      errorColorPreset: DEFAULT_UI_COLOR_PRESETS.error,
      browserNotificationsEnabled: false,
      autoMarkNotificationsAsRead: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setLocale: (locale) => set({ locale }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setSidebarPosition: (sidebarPosition) => set({ sidebarPosition }),
      setComponentSize: (componentSize) => set({ componentSize }),
      setColorPreset: (key, color) =>
        set({
          ...(key === 'primary' ? { primaryColorPreset: color } : {}),
          ...(key === 'success' ? { successColorPreset: color } : {}),
          ...(key === 'warning' ? { warningColorPreset: color } : {}),
          ...(key === 'error' ? { errorColorPreset: color } : {}),
        }),
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
        primaryColorPreset: state.primaryColorPreset,
        successColorPreset: state.successColorPreset,
        warningColorPreset: state.warningColorPreset,
        errorColorPreset: state.errorColorPreset,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
        autoMarkNotificationsAsRead: state.autoMarkNotificationsAsRead,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(typeof persistedState === 'object' && persistedState !== null ? persistedState : {}),
        componentSize:
          (persistedState as Partial<UiState> | undefined)?.componentSize ??
          DEFAULT_ANT_COMPONENT_SIZE,
        primaryColorPreset:
          (persistedState as Partial<UiState> | undefined)?.primaryColorPreset ??
          DEFAULT_UI_COLOR_PRESETS.primary,
        successColorPreset:
          (persistedState as Partial<UiState> | undefined)?.successColorPreset ??
          DEFAULT_UI_COLOR_PRESETS.success,
        warningColorPreset:
          (persistedState as Partial<UiState> | undefined)?.warningColorPreset ??
          DEFAULT_UI_COLOR_PRESETS.warning,
        errorColorPreset:
          (persistedState as Partial<UiState> | undefined)?.errorColorPreset ??
          DEFAULT_UI_COLOR_PRESETS.error,
        sidebarPosition:
          (persistedState as Partial<UiState> | undefined)?.sidebarPosition ??
          DEFAULT_SIDEBAR_POSITION,
      }),
    },
  ),
)
