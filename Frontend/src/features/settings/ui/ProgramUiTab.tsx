import { Card, Divider, Radio, Select, Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { SettingRow } from '@/features/settings/ui/SettingRow'
import { ANT_COMPONENT_SIZES, SIDEBAR_POSITIONS } from '@/shared/lib/constants'
import {
  UI_COLOR_PRESET_OPTIONS,
  UI_COLOR_PRESET_VALUES,
  type UiSemanticColorKey,
} from '@/shared/lib/theme-colors'
import { useUiStore } from '@/shared/stores/ui-store'
import type {
  AntComponentSize,
  SidebarPosition,
  ThemeMode,
  UiColorPreset,
} from '@/shared/types'

const THEME_MODES: ThemeMode[] = ['light', 'dark']

export function ProgramUiTab() {
  const { t } = useTranslation()
  const componentSize = useUiStore((state) => state.componentSize)
  const setComponentSize = useUiStore((state) => state.setComponentSize)
  const themeMode = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const sidebarPosition = useUiStore((state) => state.sidebarPosition)
  const setSidebarPosition = useUiStore((state) => state.setSidebarPosition)
  const primaryColorPreset = useUiStore((state) => state.primaryColorPreset)
  const successColorPreset = useUiStore((state) => state.successColorPreset)
  const warningColorPreset = useUiStore((state) => state.warningColorPreset)
  const errorColorPreset = useUiStore((state) => state.errorColorPreset)
  const setColorPreset = useUiStore((state) => state.setColorPreset)

  const renderColorOption = (preset: UiColorPreset) => ({
    value: preset,
    label: (
      <Space size={10}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: UI_COLOR_PRESET_VALUES[preset],
            display: 'inline-block',
          }}
        />
        <span>{t(`settingsPage.programUi.colors.${preset}`)}</span>
      </Space>
    ),
  })

  const renderColorSelect = (key: UiSemanticColorKey, value: UiColorPreset) => (
    <Select
      value={value}
      style={{ minWidth: 240 }}
      options={UI_COLOR_PRESET_OPTIONS.map(renderColorOption)}
      onChange={(nextValue) => setColorPreset(key, nextValue)}
    />
  )

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

      <Divider />

      <SettingRow label={t('settingsPage.programUi.primaryColor')}>
        {renderColorSelect('primary', primaryColorPreset)}
      </SettingRow>

      <Divider />

      <SettingRow label={t('settingsPage.programUi.successColor')}>
        {renderColorSelect('success', successColorPreset)}
      </SettingRow>

      <Divider />

      <SettingRow label={t('settingsPage.programUi.warningColor')}>
        {renderColorSelect('warning', warningColorPreset)}
      </SettingRow>

      <Divider />

      <SettingRow label={t('settingsPage.programUi.errorColor')}>
        <Space direction="vertical" size={8} style={{ alignItems: 'flex-start' }}>
          {renderColorSelect('error', errorColorPreset)}
          <Space wrap>
            <Tag color={UI_COLOR_PRESET_VALUES[primaryColorPreset]}>
              {t('settingsPage.programUi.preview.primary')}
            </Tag>
            <Tag color={UI_COLOR_PRESET_VALUES[successColorPreset]}>
              {t('settingsPage.programUi.preview.success')}
            </Tag>
            <Tag color={UI_COLOR_PRESET_VALUES[warningColorPreset]}>
              {t('settingsPage.programUi.preview.warning')}
            </Tag>
            <Tag color={UI_COLOR_PRESET_VALUES[errorColorPreset]}>
              {t('settingsPage.programUi.preview.error')}
            </Tag>
          </Space>
        </Space>
      </SettingRow>
    </Card>
  )
}
