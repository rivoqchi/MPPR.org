export type AppLocale = 'uz' | 'uzc' | 'ru' | 'en'

export type ThemeMode = 'light' | 'dark'

export type AntComponentSize = 'small' | 'middle' | 'large'

export type SidebarPosition = 'left' | 'right'

export interface ApiError {
  message: string
  statusCode?: number
}
