import {
  BookOutlined,
  CalendarOutlined,
  ControlOutlined,
  FileTextOutlined,
  HomeOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MENU_CONFIG, type MenuItemConfig } from '@/shared/config/menu'

const iconMap: Record<string, ReactNode> = {
  home: <HomeOutlined />,
  book: <BookOutlined />,
  settings: <SettingOutlined />,
  file: <FileTextOutlined />,
  calendar: <CalendarOutlined />,
  list: <UnorderedListOutlined />,
  control: <ControlOutlined />,
}

function filterMenuConfig(
  items: MenuItemConfig[],
  canView: (path: string) => boolean,
): MenuItemConfig[] {
  return items
    .map((item) => {
      if (item.children) {
        const children = filterMenuConfig(item.children, canView)

        if (children.length === 0) {
          return null
        }

        return {
          ...item,
          children,
        }
      }

      if (item.path && !canView(item.path)) {
        return null
      }

      return item
    })
    .filter((item): item is MenuItemConfig => item !== null)
}

function buildMenuItems(items: MenuItemConfig[], t: TFunction): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon ? iconMap[item.icon] : undefined,
    label: item.path ? <Link to={item.path}>{t(item.labelKey)}</Link> : t(item.labelKey),
    children: item.children ? buildMenuItems(item.children, t) : undefined,
  }))
}

export function getSidebarMenuItems(
  t: TFunction,
  canView: (path: string) => boolean = () => true,
): MenuProps['items'] {
  return buildMenuItems(filterMenuConfig(MENU_CONFIG, canView), t)
}
