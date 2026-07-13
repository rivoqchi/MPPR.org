import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle={t('errors.notFound')}
        extra={[
          <Button type="primary" key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            {t('errors.goBack')}
          </Button>,
          <Button key="home" icon={<HomeOutlined />} onClick={() => navigate('/')}>
            {t('errors.backHome')}
          </Button>,
        ]}
      />
    </div>
  )
}
