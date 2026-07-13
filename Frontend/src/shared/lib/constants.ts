export const ACCESS_TOKEN_KEY = 'access_token'

export const DEFAULT_ANT_COMPONENT_SIZE = 'middle' as const

export const ANT_COMPONENT_SIZES = ['small', 'middle', 'large'] as const

export const SIDEBAR_POSITIONS = ['left', 'right'] as const
export const DEFAULT_SIDEBAR_POSITION = 'left' as const

export const APP_LOGO_SHORT = 'MPPR'
export const APP_NAME = 'MPPR tizimi'

export const APP_LOCALES = ['uz', 'uzc', 'ru', 'en'] as const

export const LOCALE_LABELS: Record<(typeof APP_LOCALES)[number], string> = {
  uz: "O'zbek",
  uzc: 'Ўзбек',
  ru: 'Русский',
  en: 'English',
}

export const NOTIFICATION_CONFIG = {
  placement: 'bottom' as const,
  bottom: 24,
}

export const TABLE_PAGE_SIZE = 100
