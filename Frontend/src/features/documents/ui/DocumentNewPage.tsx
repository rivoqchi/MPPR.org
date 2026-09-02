import { Alert, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { createDocument } from '@/shared/api/documents-api'
import { resolveApiErrorMessage } from '@/shared/lib/api-error'

export function DocumentNewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    createDocument()
      .then((document) => {
        if (!cancelled) {
          navigate(`/documents/${document.id}`, { replace: true })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { status?: number } }).response?.status === 'number'
            ? (error as { response: { status: number } }).response.status
            : undefined

        if (statusCode === 404) {
          setErrorMessage(t('documents.createError'))
          return
        }

        setErrorMessage(
          resolveApiErrorMessage(error, t, 'documents.loadError'),
        )
      })

    return () => {
      cancelled = true
    }
  }, [navigate, t])

  if (errorMessage) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={errorMessage} showIcon />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
      <Spin size="large" fullscreen tip={t('documents.creating')} />
    </div>
  )
}
