import { useEffect } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/shared/stores/ui-store'

const dayjsLocales = {
  uz: 'uz',
  uzc: 'uz',
  ru: 'ru',
  en: 'en',
} as const

export function useLocaleSync() {
  const locale = useUiStore((state) => state.locale)
  const { i18n } = useTranslation()

  useEffect(() => {
    void i18n.changeLanguage(locale)
    dayjs.locale(dayjsLocales[locale])
  }, [i18n, locale])
}
