import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'

export function SettingsPlaceholderTab() {
  const { t } = useTranslation()

  return (
    <Typography.Text type="secondary">{t('settingsPage.placeholder')}</Typography.Text>
  )
}
