import { MENU_CONFIG, type MenuItemConfig } from '@/shared/config/menu'

export type PermissionPage = {
  key: string
  labelKey: string
}

function collectPermissionPages(items: MenuItemConfig[]): PermissionPage[] {
  return items.flatMap((item) => [
    ...(item.path ? [{ key: item.path, labelKey: item.labelKey }] : []),
    ...(item.children ? collectPermissionPages(item.children) : []),
  ])
}

export const PERMISSION_PAGES: PermissionPage[] = [
  ...collectPermissionPages(MENU_CONFIG),
  { key: '/profile', labelKey: 'menu.profile' },
]
