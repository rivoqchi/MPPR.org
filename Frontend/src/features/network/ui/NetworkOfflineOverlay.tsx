import { ReloadOutlined, WifiOutlined } from '@ant-design/icons'
import { Button, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNetworkStore } from '@/shared/lib/network/network-store'

export function NetworkOfflineOverlay() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const isOffline = useNetworkStore((state) => state.isOffline)
  const isChecking = useNetworkStore((state) => state.isChecking)
  const recheck = useNetworkStore((state) => state.recheck)

  if (!isOffline) {
    return null
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="network-offline-title"
      aria-describedby="network-offline-description"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: `linear-gradient(135deg, ${token.colorPrimaryBg}cc 0%, ${token.colorBgLayout}e6 100%)`,
        backdropFilter: 'blur(32px) saturate(140%)',
        WebkitBackdropFilter: 'blur(32px) saturate(140%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          padding: '40px 32px',
          borderRadius: token.borderRadiusLG,
          background: `${token.colorBgElevated}d9`,
          border: `1px solid ${token.colorBorderSecondary}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: token.boxShadowSecondary,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
            color: token.colorWhite,
            fontSize: 32,
          }}
        >
          <WifiOutlined />
        </div>

        <Typography.Title
          id="network-offline-title"
          level={3}
          style={{ marginBottom: 12, color: token.colorText }}
        >
          {t('network.offline.title')}
        </Typography.Title>

        <Typography.Paragraph
          id="network-offline-description"
          style={{ marginBottom: 8, fontSize: 16, color: token.colorTextSecondary }}
        >
          {t('network.offline.description')}
        </Typography.Paragraph>

        <Typography.Paragraph style={{ marginBottom: 28, color: token.colorTextSecondary }}>
          {t('network.offline.hint')}
        </Typography.Paragraph>

        <Button
          type="primary"
          size="large"
          icon={<ReloadOutlined />}
          loading={isChecking}
          onClick={() => void recheck()}
        >
          {t('network.offline.retry')}
        </Button>
      </div>
    </div>
  )
}
