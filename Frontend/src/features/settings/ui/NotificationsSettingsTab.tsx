import { Card, Divider, Switch, message } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
} from '@/entities/notification/lib/browser-notifications'
import { SettingRow } from '@/features/settings/ui/SettingRow'
import { useUiStore } from '@/shared/stores/ui-store'

export function NotificationsSettingsTab() {
  const { t } = useTranslation()
  const browserNotificationsEnabled = useUiStore((state) => state.browserNotificationsEnabled)
  const setBrowserNotificationsEnabled = useUiStore((state) => state.setBrowserNotificationsEnabled)
  const autoMarkNotificationsAsRead = useUiStore((state) => state.autoMarkNotificationsAsRead)
  const setAutoMarkNotificationsAsRead = useUiStore(
    (state) => state.setAutoMarkNotificationsAsRead,
  )

  const isSupported = isBrowserNotificationSupported()
  const permission = getBrowserNotificationPermission()

  useEffect(() => {
    if (browserNotificationsEnabled && permission !== 'granted') {
      setBrowserNotificationsEnabled(false)
    }
  }, [browserNotificationsEnabled, permission, setBrowserNotificationsEnabled])

  const browserDescription = !isSupported
    ? t('settingsPage.notifications.unsupported')
    : permission === 'denied'
      ? t('settingsPage.notifications.denied')
      : t('settingsPage.notifications.description')

  const handleBrowserToggle = async (checked: boolean) => {
    if (!checked) {
      setBrowserNotificationsEnabled(false)
      return
    }

    if (!isSupported) {
      message.warning(t('settingsPage.notifications.unsupported'))
      return
    }

    const nextPermission = await requestBrowserNotificationPermission()

    if (nextPermission !== 'granted') {
      message.warning(t('settingsPage.notifications.permissionRequired'))
      setBrowserNotificationsEnabled(false)
      return
    }

    setBrowserNotificationsEnabled(true)
    message.success(t('settingsPage.notifications.enabled'))
  }

  const handleAutoMarkToggle = (checked: boolean) => {
    setAutoMarkNotificationsAsRead(checked)
    message.success(
      checked
        ? t('settingsPage.notifications.autoMarkEnabled')
        : t('settingsPage.notifications.autoMarkDisabled'),
    )
  }

  return (
    <Card title={t('settingsPage.notifications.title')} style={{ width: '100%' }}>
      <SettingRow label={t('settingsPage.notifications.browser')} description={browserDescription}>
        <Switch
          checked={browserNotificationsEnabled}
          checkedChildren="On"
          unCheckedChildren="Off"
          disabled={!isSupported || permission === 'denied'}
          onChange={(checked) => void handleBrowserToggle(checked)}
        />
      </SettingRow>

      <Divider />

      <SettingRow
        label={t('settingsPage.notifications.autoMark')}
        description={t('settingsPage.notifications.autoMarkDescription')}
      >
        <Switch
          checked={autoMarkNotificationsAsRead}
          checkedChildren="On"
          unCheckedChildren="Off"
          onChange={handleAutoMarkToggle}
        />
      </SettingRow>
    </Card>
  )
}
