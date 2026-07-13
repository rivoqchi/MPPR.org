import enUS from 'antd/locale/en_US'
import type { Locale } from 'antd/es/locale'

export const uzUZ: Locale = {
  ...enUS,
  locale: 'uz-UZ',
  Pagination: {
    ...enUS.Pagination,
    items_per_page: '/ sahifa',
  },
  Table: {
    ...enUS.Table,
    filterConfirm: 'Filtrlash',
    filterReset: 'Tozalash',
    emptyText: "Ma'lumot yo'q",
  },
  Modal: {
    ...enUS.Modal,
    okText: 'Saqlash',
    cancelText: 'Bekor qilish',
    justOkText: 'OK',
  },
}

export const uzCyrlUZ: Locale = {
  ...enUS,
  locale: 'uz-Cyrl-UZ',
  Pagination: {
    ...enUS.Pagination,
    items_per_page: '/ саҳифа',
  },
  Table: {
    ...enUS.Table,
    filterConfirm: 'Филтрлаш',
    filterReset: 'Тозалаш',
    emptyText: 'Маълумот йўқ',
  },
  Modal: {
    ...enUS.Modal,
    okText: 'Сақлаш',
    cancelText: 'Бекор қилиш',
    justOkText: 'OK',
  },
}
