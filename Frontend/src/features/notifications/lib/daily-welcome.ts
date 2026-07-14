import dayjs from 'dayjs'
import { i18n } from '@/shared/lib/i18n'
import { useUiStore } from '@/shared/stores/ui-store'
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
} from '@/entities/notification/lib/browser-notifications'

const STORAGE_PREFIX = 'mppr:daily-welcome'

function getStorageKey(userId: string, dateKey: string): string {
  return `${STORAGE_PREFIX}:${userId}:${dateKey}`
}

export function hasShownDailyWelcomeToday(userId: string): boolean {
  const dateKey = dayjs().format('YYYY-MM-DD')
  return localStorage.getItem(getStorageKey(userId, dateKey)) === '1'
}

export function markDailyWelcomeShown(userId: string): void {
  const dateKey = dayjs().format('YYYY-MM-DD')
  localStorage.setItem(getStorageKey(userId, dateKey), '1')
}

export function getDailyWelcomeCopy(name?: string): { title: string; message: string } {
  const safeName = name?.trim()

  return {
    title: safeName
      ? i18n.t('notifications.dailyWelcome.titleWithName', { name: safeName })
      : i18n.t('notifications.dailyWelcome.title'),
    message: i18n.t('notifications.dailyWelcome.message'),
  }
}

export function showBrowserDailyWelcome(title: string, message: string): void {
  if (!isBrowserNotificationSupported() || getBrowserNotificationPermission() !== 'granted') {
    return
  }

  if (!useUiStore.getState().browserNotificationsEnabled) {
    return
  }

  const dateKey = dayjs().format('YYYY-MM-DD')
  const browserNotification = new window.Notification(title, {
    body: message,
    tag: `daily-welcome-${dateKey}`,
  })

  browserNotification.onclick = () => {
    window.focus()
    browserNotification.close()
  }
}
