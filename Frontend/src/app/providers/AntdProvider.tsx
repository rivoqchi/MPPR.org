import { App, ConfigProvider, theme } from 'antd'
import enUS from 'antd/locale/en_US'
import ruRU from 'antd/locale/ru_RU'
import type { ReactNode } from 'react'
import { UI_COLOR_PRESET_VALUES } from '@/shared/lib/theme-colors'
import { uzCyrlUZ, uzUZ } from '@/shared/lib/antd-locale'
import { NOTIFICATION_CONFIG } from '@/shared/lib/constants'
import { useUiStore } from '@/shared/stores/ui-store'
import type { AppLocale } from '@/shared/types'

const antdLocales = {
  uz: uzUZ,
  uzc: uzCyrlUZ,
  ru: ruRU,
  en: enUS,
} satisfies Record<AppLocale, typeof enUS>

interface AntdProviderProps {
  children: ReactNode
}

export function AntdProvider({ children }: AntdProviderProps) {
  const themeMode = useUiStore((state) => state.theme)
  const locale = useUiStore((state) => state.locale)
  const componentSize = useUiStore((state) => state.componentSize)
  const primaryColorPreset = useUiStore((state) => state.primaryColorPreset)
  const successColorPreset = useUiStore((state) => state.successColorPreset)
  const warningColorPreset = useUiStore((state) => state.warningColorPreset)
  const errorColorPreset = useUiStore((state) => state.errorColorPreset)

  return (
    <ConfigProvider
      componentSize={componentSize}
      locale={antdLocales[locale]}
      modal={{
        centered: true,
      }}
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: UI_COLOR_PRESET_VALUES[primaryColorPreset],
          colorSuccess: UI_COLOR_PRESET_VALUES[successColorPreset],
          colorWarning: UI_COLOR_PRESET_VALUES[warningColorPreset],
          colorError: UI_COLOR_PRESET_VALUES[errorColorPreset],
          borderRadius: 6,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      <App notification={NOTIFICATION_CONFIG}>{children}</App>
    </ConfigProvider>
  )
}
