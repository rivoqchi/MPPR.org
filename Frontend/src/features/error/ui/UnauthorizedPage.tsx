import { HomeOutlined, LoginOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { clearTokens } from '@/shared/lib/token-storage'
import { resetAppDataSession } from '@/shared/lib/realtime/sync-app-data'
import { useAuthStore } from '@/entities/user/model/auth-store'

export function UnauthorizedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const handleLogin = () => {
    clearTokens()
    resetAppDataSession()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Result
        status="warning"
        title="401"
        subTitle={t('errors.unauthorized')}
        extra={[
          <Button type="primary" key="login" icon={<LoginOutlined />} onClick={handleLogin}>
            {t('auth.login')}
          </Button>,
          <Button key="home" icon={<HomeOutlined />} onClick={() => navigate('/')}>
            {t('errors.backHome')}
          </Button>,
        ]}
      />
    </div>
  )
}
