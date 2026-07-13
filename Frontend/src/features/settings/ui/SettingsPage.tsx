import { Tabs } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ProgramUiTab } from '@/features/settings/ui/ProgramUiTab'
import { NotificationsSettingsTab } from '@/features/settings/ui/NotificationsSettingsTab'
import { SettingsPlaceholderTab } from '@/features/settings/ui/SettingsPlaceholderTab'
import { scrollablePageStyle } from '@/shared/lib/page-layout'

export function SettingsPage() {
  const { t } = useTranslation()

  const items = useMemo(
    () => [
      {
        key: '1',
        label: t('settingsPage.tabs.tab1'),
        children: <NotificationsSettingsTab />,
      },
      {
        key: '2',
        label: t('settingsPage.tabs.tab2'),
        children: <SettingsPlaceholderTab />,
      },
      {
        key: '3',
        label: t('settingsPage.tabs.tab3'),
        children: <SettingsPlaceholderTab />,
      },
      {
        key: '4',
        label: t('settingsPage.tabs.tab4'),
        children: <SettingsPlaceholderTab />,
      },
      {
        key: '5',
        label: t('settingsPage.tabs.programUi'),
        children: <ProgramUiTab />,
      },
    ],
    [t],
  )

  return (
    <div style={scrollablePageStyle}>
      <Tabs items={items} style={{ width: '100%' }} />
    </div>
  )
}
