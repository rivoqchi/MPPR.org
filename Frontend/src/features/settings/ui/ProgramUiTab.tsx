import { Card, Divider, Radio } from 'antd'
import { useTranslation } from 'react-i18next'
import { SettingRow } from '@/features/settings/ui/SettingRow'
import { ANT_COMPONENT_SIZES, SIDEBAR_POSITIONS } from '@/shared/lib/constants'
import { useUiStore } from '@/shared/stores/ui-store'
import type { AntComponentSize, SidebarPosition, ThemeMode } from '@/shared/types'

const THEME_MODES: ThemeMode[] = ['light', 'dark']

export function ProgramUiTab() {
  const { t } = useTranslation()
  const componentSize = useUiStore((state) => state.componentSize)
  const setComponentSize = useUiStore((state) => state.setComponentSize)
  const themeMode = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const sidebarPosition = useUiStore((state) => state.sidebarPosition)
  const setSidebarPosition = useUiStore((state) => state.setSidebarPosition)

  return (
    <Card title={t('settingsPage.programUi.title')} style={{ width: '100%' }}>
      <SettingRow label={t('settingsPage.programUi.sidebarPosition')}>
        <Radio.Group
          value={sidebarPosition}
          onChange={(event) => setSidebarPosition(event.target.value as SidebarPosition)}
        >
          {SIDEBAR_POSITIONS.map((position) => (
            <Radio.Button key={position} value={position}>
              {t(`settingsPage.programUi.sidebarPositions.${position}`)}
            </Radio.Button>
          ))}
        </Radio.Group>
      </SettingRow>

      <Divider />

      <SettingRow label={t('settingsPage.programUi.componentSize')}>
        <Radio.Group
          value={componentSize}
          onChange={(event) => setComponentSize(event.target.value as AntComponentSize)}
        >
          {ANT_COMPONENT_SIZES.map((size) => (
            <Radio.Button key={size} value={size}>
              {t(`settingsPage.programUi.sizes.${size}`)}
            </Radio.Button>
          ))}
        </Radio.Group>
      </SettingRow>

      <Divider />

      <SettingRow label={t('settingsPage.programUi.theme')}>
        <Radio.Group
          value={themeMode}
          onChange={(event) => setTheme(event.target.value as ThemeMode)}
        >
          {THEME_MODES.map((mode) => (
            <Radio.Button key={mode} value={mode}>
              {t(`settingsPage.programUi.themes.${mode}`)}
            </Radio.Button>
          ))}
        </Radio.Group>
      </SettingRow>
    </Card>
  )
}
