import { Descriptions, Drawer, Space, Tag, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ErrorLog } from '@/entities/error-log/model/types'
import { formatErrorLogTime, formatResolvedErrorHint, formatResolvedErrorMessage } from '@/features/error-logs/lib/error-log-display'

interface ErrorLogDetailDrawerProps {
  open: boolean
  errorLog: ErrorLog | null
  onClose: () => void
}

export function ErrorLogDetailDrawer({ open, errorLog, onClose }: ErrorLogDetailDrawerProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()

  if (!errorLog) {
    return null
  }

  const actorName =
    errorLog.userFullName ??
    (errorLog.user ? `${errorLog.user.firstName} ${errorLog.user.lastName}`.trim() : null)
  const actorPhone = errorLog.userPhone ?? errorLog.user?.phone
  const actorRole = errorLog.user?.appRole?.name
  const validationErrors = Array.isArray(errorLog.metadata?.validationErrors)
    ? errorLog.metadata.validationErrors.map(String)
    : []

  return (
    <Drawer
      title={t('errorLogsPage.detail.title')}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={errorLog.severity === 'system' ? 'red' : 'orange'}>
            {t(`errorLogsPage.severity.${errorLog.severity}`)}
          </Tag>
          <Tag>{t(`errorLogsPage.source.${errorLog.source}`)}</Tag>
          {errorLog.resolved ? <Tag color="green">{t('errorLogsPage.resolved')}</Tag> : null}
          {errorLog.statusCode ? <Tag color="blue">HTTP {errorLog.statusCode}</Tag> : null}
        </Space>

        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label={t('errorLogsPage.detail.code')}>
            {errorLog.code ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.message')}>
            {formatResolvedErrorMessage(errorLog, t)}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.solution')}>
            {formatResolvedErrorHint(errorLog, t)}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.actor')}>
            {actorName ? (
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{actorName}</Typography.Text>
                {actorPhone ? <Typography.Text>{actorPhone}</Typography.Text> : null}
                {actorRole ? (
                  <Typography.Text type="secondary">{actorRole}</Typography.Text>
                ) : null}
              </Space>
            ) : (
              t('errorLogsPage.detail.unknownActor')
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.route')}>
            {errorLog.route ? (
              <Link to={errorLog.route} onClick={onClose}>
                {errorLog.route}
              </Link>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.apiPath')}>
            {errorLog.apiPath ? `${errorLog.method ?? 'GET'} ${errorLog.apiPath}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.time')}>
            {formatErrorLogTime(errorLog.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label={t('errorLogsPage.detail.userAgent')}>
            {errorLog.userAgent ?? '—'}
          </Descriptions.Item>
        </Descriptions>

        {validationErrors.length > 0 ? (
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {t('errorLogsPage.detail.validationErrors')}
            </Typography.Title>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((item) => (
                <li key={item}>
                  <Typography.Text>{item}</Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {errorLog.stack ? (
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {t('errorLogsPage.detail.stack')}
            </Typography.Title>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: token.borderRadius,
                background: token.colorFillAlter,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
              }}
            >
              {errorLog.stack}
            </pre>
          </div>
        ) : null}

        {errorLog.metadata ? (
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {t('errorLogsPage.detail.metadata')}
            </Typography.Title>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: token.borderRadius,
                background: token.colorFillAlter,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
              }}
            >
              {JSON.stringify(errorLog.metadata, null, 2)}
            </pre>
          </div>
        ) : null}
      </Space>
    </Drawer>
  )
}
