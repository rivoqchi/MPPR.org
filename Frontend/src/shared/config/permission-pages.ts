import { MENU_CONFIG, SETTINGS_MENU_ITEM, type MenuItemConfig } from '@/shared/config/menu'

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
  { key: '/settings', labelKey: SETTINGS_MENU_ITEM.labelKey },
  { key: '/profile', labelKey: 'menu.profile' },
  { key: '/documents/new', labelKey: 'menu.documents.new' },
  { key: '/archives/new', labelKey: 'menu.archives.new' },
]
