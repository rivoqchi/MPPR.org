import { App } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatResolvedApiErrorDescription,
  resolveApiError,
} from '@/shared/lib/api-error'

interface NotifyApiErrorOptions {
  fallbackKey?: string
}

export function useNotifyApiError() {
  const { t } = useTranslation()
  const { notification } = App.useApp()

  const notifyApiError = useCallback(
    (error: unknown, options?: NotifyApiErrorOptions) => {
      const resolved = resolveApiError(error, t, options?.fallbackKey)

      notification.error({
        message: resolved.title,
        description: formatResolvedApiErrorDescription(resolved, t),
        duration: resolved.category === 'system' ? 8 : 5,
        styles: {
          description: {
            whiteSpace: 'pre-line',
          },
        },
      })
    },
    [notification, t],
  )

  const notifyLocalizedError = useCallback(
    (
      messageKey: string,
      titleKey = 'api.errors.categories.user',
      params?: Record<string, unknown>,
    ) => {
      notification.error({
        message: t(titleKey),
        description: t(messageKey, params),
        duration: 5,
      })
    },
    [notification, t],
  )

  return { notifyApiError, notifyLocalizedError }
}
