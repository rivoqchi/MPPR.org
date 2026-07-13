import { useEffect } from 'react'
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError, useNavigate, useLocation } from 'react-router-dom'
import { NotFoundPage } from '@/features/error/ui/NotFoundPage'
import { reportClientError } from '@/shared/lib/error-log-reporter'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'

export function RouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const message = isRouteErrorResponse(error)
      ? error.statusText || String(error.data ?? error.status)
      : error instanceof Error
        ? error.message
        : t('errors.unexpected')

    void reportClientError({
      source: 'route',
      severity: 'system',
      code: isRouteErrorResponse(error) ? `ROUTE_ERROR_${error.status}` : 'ROUTE_ERROR',
      message,
      route: `${location.pathname}${location.search}`,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: isRouteErrorResponse(error) ? error.status : undefined,
    })
  }, [error, isAuthenticated, location.pathname, location.search, t])

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  const description = isRouteErrorResponse(error)
    ? error.statusText || error.data?.toString()
    : error instanceof Error
      ? error.message
      : t('errors.unexpected')

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
        status="error"
        title={t('errors.unexpectedTitle')}
        subTitle={description || t('errors.unexpected')}
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
