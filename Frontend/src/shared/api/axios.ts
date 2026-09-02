import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { ACCESS_TOKEN_KEY } from '@/shared/lib/constants'
import { ensureValidAccessToken } from '@/shared/lib/ensure-access-token'
import type { ApiErrorResponse } from '@/shared/api/types'
import { isErrorPath, redirectToErrorPage } from '@/shared/lib/error-navigation'
import { getClientRouteHeaderValue } from '@/shared/lib/error-log-reporter'
import { isNetworkFailure } from '@/shared/lib/network/is-network-failure'
import { useNetworkStore } from '@/shared/lib/network/network-store'
import { resetAppDataSession } from '@/shared/lib/realtime/sync-app-data'
import { clearTokens, getAccessToken } from '@/shared/lib/token-storage'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (typeof window !== 'undefined') {
    config.headers['X-Client-Route'] = getClientRouteHeaderValue()
  }

  // FormData uchun boundary bilan multipart header avtomatik qo'yilishi kerak.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }

  return config
})

api.interceptors.response.use(
  (response) => {
    useNetworkStore.getState().setOnline()
    return response
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    if (isNetworkFailure(error)) {
      useNetworkStore.getState().setOffline()
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status
    const requestUrl = originalRequest?.url ?? ''

    if (
      status === 403 &&
      !isErrorPath(window.location.pathname) &&
      !requestUrl.includes('/ppr-calendar/')
    ) {
      redirectToErrorPage('/403')
      return Promise.reject(error)
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      refreshPromise ??= ensureValidAccessToken().finally(() => {
        refreshPromise = null
      })

      const newToken = await refreshPromise

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }

      clearTokens()
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      resetAppDataSession()
      useAuthStore.getState().logout()

      if (!isErrorPath(window.location.pathname)) {
        redirectToErrorPage('/401')
      }
    }

    return Promise.reject(error)
  },
)
