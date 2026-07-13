import { Grid } from 'antd'

export function useLayoutBreakpoint() {
  const screens = Grid.useBreakpoint()

  const isMobileOrTablet = Boolean(screens.xs || screens.sm || screens.md) && !screens.lg
  const isDesktop = !isMobileOrTablet

  return {
    isDesktop,
    isMobileOrTablet,
  }
}
