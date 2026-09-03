import { App } from 'antd'
import { useEffect } from 'react'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import {
  getDailyWelcomeCopy,
  hasShownDailyWelcomeToday,
  markDailyWelcomeShown,
  showBrowserDailyWelcome,
} from '@/features/notifications/lib/daily-welcome'
import { useUiStore } from '@/shared/stores/ui-store'

export function useDailyWelcomeGreeting() {
  const { notification } = App.useApp()
  const currentUser = useAuthStore((state) => state.currentUser)
  const locale = useUiStore((state) => state.locale)

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    if (hasShownDailyWelcomeToday(currentUser.id)) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (hasShownDailyWelcomeToday(currentUser.id)) {
        return
      }

      const { title, message } = getDailyWelcomeCopy(
        currentUser.firstName || getUserFullName(currentUser),
      )

      notification.open({
        message: title,
        description: message,
        duration: 6,
      })

      showBrowserDailyWelcome(title, message)
      markDailyWelcomeShown(currentUser.id)
    }, 800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentUser, locale, notification])
}
