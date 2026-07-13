import axios, { type AxiosError } from 'axios'
import type { TFunction } from 'i18next'
import type { ApiErrorResponse } from '@/shared/api/types'

export type ApiErrorCategory = 'user' | 'system'

export interface ResolvedApiError {
  title: string
  message: string
  hint?: string
  category: ApiErrorCategory
  code?: string
}

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/

function extractApiErrorPayload(value: unknown): ApiErrorResponse | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const body = value as Record<string, unknown>

  if (body.success === false && typeof body.statusCode === 'number') {
    return {
      success: false,
      statusCode: body.statusCode,
      code: typeof body.code === 'string' ? body.code : String(body.message ?? ''),
      message: typeof body.message === 'string' ? body.message : String(body.code ?? ''),
      category: body.category === 'system' ? 'system' : 'user',
      hint: typeof body.hint === 'string' ? body.hint : undefined,
      errors: Array.isArray(body.errors) ? body.errors.map(String) : [],
      retryAfterSeconds:
        typeof body.retryAfterSeconds === 'number' && Number.isFinite(body.retryAfterSeconds)
          ? Math.max(0, Math.ceil(body.retryAfterSeconds))
          : undefined,
    }
  }

  if (typeof body.statusCode === 'number') {
    if (Array.isArray(body.message)) {
      return {
        success: false,
        statusCode: body.statusCode,
        code: 'VALIDATION_FAILED',
        message: 'VALIDATION_FAILED',
        category: 'user',
        errors: body.message.map(String),
      }
    }

    if (typeof body.message === 'string') {
      return {
        success: false,
        statusCode: body.statusCode,
        code: body.message,
        message: body.message,
        category: body.statusCode >= 500 ? 'system' : 'user',
        errors: [],
      }
    }
  }

  return null
}

function translateByKey(key: string, t: TFunction): string | null {
  const translation = t(key)
  return translation !== key ? translation : null
}

function translateErrorCode(code: string, t: TFunction): string | null {
  const normalized = code.trim()

  if (!normalized) {
    return null
  }

  return translateByKey(`api.errors.${normalized}`, t)
}

function translateHintCode(code: string | undefined, t: TFunction): string | undefined {
  if (!code) {
    return undefined
  }

  const translated = translateByKey(`api.errors.hints.${code}`, t)

  return translated ?? undefined
}

function isTechnicalMessage(message: string): boolean {
  const lower = message.toLowerCase()

  return (
    lower.includes('prisma') ||
    lower.includes('column ') ||
    lower.includes('relation ') ||
    lower.includes('econnrefused') ||
    lower.includes('network error') ||
    lower.includes('timeout') ||
    lower.includes('entity too large') ||
    lower.includes('does not exist in the current database')
  )
}

function translateValidationItem(item: string, t: TFunction): string {
  const translated = translateErrorCode(item, t)

  if (translated) {
    return translated
  }

  if (isTechnicalMessage(item)) {
    return t('api.errors.DATABASE_SCHEMA_OUT_OF_DATE')
  }

  if (ERROR_CODE_PATTERN.test(item)) {
    return t('api.errors.VALIDATION_FAILED')
  }

  return t('api.errors.VALIDATION_FAILED')
}

function resolveCategoryTitle(category: ApiErrorCategory, t: TFunction): string {
  return t(`api.errors.categories.${category}`)
}

function resolveStatusFallback(status: number | undefined, t: TFunction): ResolvedApiError {
  if (status === 401) {
    return buildResolvedError('INVALID_CREDENTIALS', 'user', t)
  }

  if (status === 403) {
    return buildResolvedError('FORBIDDEN', 'user', t)
  }

  if (status === 404) {
    return buildResolvedError('NOT_FOUND', 'user', t)
  }

  if (status === 413) {
    return buildResolvedError('PAYLOAD_TOO_LARGE', 'user', t)
  }

  if (status === 429) {
    return buildResolvedError('TOO_MANY_REQUESTS', 'user', t)
  }

  if (status && status >= 500) {
    return buildResolvedError('INTERNAL_SERVER_ERROR', 'system', t)
  }

  return buildResolvedError('generic', 'user', t, 'api.errors.generic')
}

function buildResolvedError(
  code: string,
  category: ApiErrorCategory,
  t: TFunction,
  messageKey = `api.errors.${code}`,
  hintCode?: string,
): ResolvedApiError {
  const message = translateByKey(messageKey, t) ?? t('api.errors.generic')

  return {
    title: resolveCategoryTitle(category, t),
    message,
    hint: translateHintCode(hintCode ?? code, t),
    category,
    code: code === 'generic' ? undefined : code,
  }
}

export function resolveApiError(
  error: unknown,
  t: TFunction,
  fallbackKey = 'api.errors.generic',
): ResolvedApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>

    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        return {
          title: resolveCategoryTitle('system', t),
          message: t('api.errors.timeout'),
          hint: translateHintCode('timeout', t),
          category: 'system',
          code: 'timeout',
        }
      }

      return {
        title: resolveCategoryTitle('system', t),
        message: t('api.errors.network'),
        hint: translateHintCode('network', t),
        category: 'system',
        code: 'network',
      }
    }

    const payload = extractApiErrorPayload(axiosError.response.data)
    const status = axiosError.response.status

    if (payload) {
      const category = payload.category ?? (status >= 500 ? 'system' : 'user')

      if (payload.errors.length > 0) {
        return {
          title: resolveCategoryTitle('user', t),
          message: payload.errors.map((item) => translateValidationItem(item, t)).join('\n'),
          hint: translateHintCode('VALIDATION_FAILED', t),
          category: 'user',
          code: payload.code,
        }
      }

      const code = payload.code || payload.message
      const translated =
        code === 'LOGIN_TEMPORARILY_LOCKED' && payload.retryAfterSeconds
          ? t('api.errors.LOGIN_TEMPORARILY_LOCKED', { seconds: payload.retryAfterSeconds })
          : translateErrorCode(code, t)

      if (translated) {
        return {
          title: resolveCategoryTitle(category, t),
          message: translated,
          hint: translateHintCode(payload.hint ?? code, t),
          category,
          code,
        }
      }

      if (isTechnicalMessage(code)) {
        return resolveStatusFallback(payload.statusCode ?? status, t)
      }

      return resolveStatusFallback(payload.statusCode ?? status, t)
    }

    if (status === 429) {
      return buildResolvedError('TOO_MANY_REQUESTS', 'user', t)
    }

    return resolveStatusFallback(status, t)
  }

  if (error instanceof Error && error.message) {
    const translated = translateErrorCode(error.message, t)

    if (translated) {
      return buildResolvedError(error.message, 'user', t)
    }

    if (error.message.toLowerCase().includes('status code 429')) {
      return buildResolvedError('TOO_MANY_REQUESTS', 'user', t)
    }

    if (isTechnicalMessage(error.message)) {
      return buildResolvedError('DATABASE_SCHEMA_OUT_OF_DATE', 'system', t)
    }
  }

  const fallbackMessage = t(fallbackKey)

  return {
    title: resolveCategoryTitle('user', t),
    message: fallbackMessage,
    category: 'user',
  }
}

export function resolveApiErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey = 'api.errors.generic',
): string {
  const resolved = resolveApiError(error, t, fallbackKey)
  const parts = [resolved.message]

  if (resolved.hint) {
    parts.push(`${t('api.errors.whatToDo')}: ${resolved.hint}`)
  }

  return parts.join('\n\n')
}

export function formatResolvedApiErrorDescription(
  resolved: ResolvedApiError,
  t: TFunction,
): string {
  if (!resolved.hint) {
    return resolved.message
  }

  return `${resolved.message}\n\n${t('api.errors.whatToDo')}: ${resolved.hint}`
}
