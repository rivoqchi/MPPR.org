import type { TFunction } from 'i18next'
import dayjs from 'dayjs'
import type { ErrorLog } from '@/entities/error-log/model/types'

export const ERROR_LOG_TIME_FORMAT = 'DD/MM/YYYY HH:mm'

function translateByKey(key: string, t: TFunction): string | null {
  const translation = t(key)
  return translation !== key ? translation : null
}

export function formatResolvedErrorMessage(errorLog: ErrorLog, t: TFunction): string {
  if (errorLog.code) {
    const translated = translateByKey(`api.errors.${errorLog.code}`, t)

    if (translated) {
      return translated
    }
  }

  return errorLog.message
}

export function formatResolvedErrorHint(errorLog: ErrorLog, t: TFunction): string {
  const hintCode = errorLog.hint ?? errorLog.code

  if (hintCode) {
    const translatedHint = translateByKey(`api.errors.hints.${hintCode}`, t)

    if (translatedHint) {
      return translatedHint
    }
  }

  return t('errorLogsPage.detail.noSolution')
}

export function formatErrorLogTime(value: string): string {
  const parsed = dayjs(value)

  return parsed.isValid() ? parsed.format(ERROR_LOG_TIME_FORMAT) : '—'
}
