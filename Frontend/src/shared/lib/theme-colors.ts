export type UiColorPreset = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan'

export type UiSemanticColorKey = 'primary' | 'success' | 'warning' | 'error'

export const DEFAULT_UI_COLOR_PRESETS: Record<UiSemanticColorKey, UiColorPreset> = {
  primary: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
}

export const UI_COLOR_PRESET_VALUES: Record<UiColorPreset, string> = {
  blue: '#1677ff',
  green: '#52c41a',
  purple: '#722ed1',
  orange: '#fa8c16',
  red: '#f5222d',
  cyan: '#13c2c2',
}

export const UI_COLOR_PRESET_OPTIONS: UiColorPreset[] = [
  'blue',
  'green',
  'purple',
  'orange',
  'red',
  'cyan',
]
