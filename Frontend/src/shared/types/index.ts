export type AppLocale = 'uz' | 'uzc' | 'ru' | 'en'

export type ThemeMode = 'light' | 'dark'

export type AntComponentSize = 'small' | 'middle' | 'large'

export type SidebarPosition = 'left' | 'right'

export type UiColorPreset = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan'

export interface ApiError {
  message: string
  statusCode?: number
}
