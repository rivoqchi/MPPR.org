import type { Notification } from '@/entities/notification/model/types'

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  return Notification.requestPermission()
}

export function showBrowserNotification(notification: Notification): void {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return
  }

  const browserNotification = new window.Notification(notification.title, {
    body: notification.message,
    tag: notification.id,
  })

  browserNotification.onclick = () => {
    window.focus()
    browserNotification.close()

    if (notification.linkPath) {
      window.location.assign(notification.linkPath)
    }
  }
}
