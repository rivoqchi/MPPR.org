import { Spin, theme } from 'antd'
import { renderAsync } from 'docx-preview'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchDocumentPreviewBlob } from '@/shared/api/documents-api'

interface DocumentDocxPreviewProps {
  documentId: string
  refreshKey?: string | number
}

export function DocumentDocxPreview({ documentId, refreshKey = 0 }: DocumentDocxPreviewProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let cancelled = false

    async function loadPreview() {
      const containerEl = containerRef.current
      if (!containerEl) {
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      containerEl.innerHTML = ''

      try {
        const blob = await fetchDocumentPreviewBlob(documentId)

        if (cancelled || !containerRef.current) {
          return
        }

        await renderAsync(blob, containerRef.current, undefined, {
          className: 'docx-preview-content',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        })
      } catch {
        if (!cancelled) {
          setErrorMessage(t('documents.previewError'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [documentId, refreshKey, t])

  return (
    <div
      className="document-a4-docx-preview"
      style={{
        background: token.colorFillAlter,
        padding: '20px 24px 32px',
      }}
    >
      {isLoading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
          <Spin tip={t('documents.previewLoading')} />
        </div>
      ) : null}

      {errorMessage ? (
        <div style={{ padding: 24, color: token.colorError }}>{errorMessage}</div>
      ) : null}

      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
    </div>
  )
}
