import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Segmented } from 'antd'
import type { SegmentedProps } from 'antd'
import { useUiStore } from '@/shared/stores/ui-store'
import type { ThemeMode } from '@/shared/types'

type ThemeModeToggleProps = {
  size?: SegmentedProps['size']
}

export function ThemeModeToggle({ size = 'middle' }: ThemeModeToggleProps) {
  const themeMode = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)

  return (
    <Segmented<ThemeMode>
      size={size}
      shape="round"
      value={themeMode}
      onChange={setTheme}
      options={[
        { value: 'light', icon: <SunOutlined /> },
        { value: 'dark', icon: <MoonOutlined /> },
      ]}
    />
  )
}
