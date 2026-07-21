import { Tabs } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ProgramUiTab } from '@/features/settings/ui/ProgramUiTab'
import { NotificationsSettingsTab } from '@/features/settings/ui/NotificationsSettingsTab'
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
