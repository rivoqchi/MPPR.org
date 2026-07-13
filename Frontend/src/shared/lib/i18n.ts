import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/shared/lib/locales/en.json'
import ru from '@/shared/lib/locales/ru.json'
import uz from '@/shared/lib/locales/uz.json'
import uzCyrl from '@/shared/lib/locales/uz-cyrl.json'

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    uzc: { translation: uzCyrl },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: 'uz',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
