import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useEffect, useRef } from 'react'
import {
  hydrateAllStores,
  isAppDataHydrated,
} from '@/shared/lib/realtime/sync-app-data'
import { syncAuthSession, waitForAuthStoreHydration } from '@/shared/lib/auth-session'
import { getAccessToken } from '@/shared/lib/token-storage'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useTranslation } from 'react-i18next'
import { App } from 'antd'

function shouldIgnoreHydrationError(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    (error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.status === 429)
  )
}

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const currentUser = useAuthStore((state) => state.currentUser)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const { notifyApiError } = useNotifyApiError()
  const notifyApiErrorRef = useRef(notifyApiError)
  const { t } = useTranslation()
  const { notification } = App.useApp()

  useEffect(() => {
    notifyApiErrorRef.current = notifyApiError
  }, [notifyApiError])

  useEffect(() => {
    let isActive = true

    void (async () => {
      await waitForAuthStoreHydration()

      if (!isActive) {
        return
      }

      syncAuthSession()

      if (!isAuthenticated) {
        return
      }

      if (!getAccessToken()) {
        useAuthStore.getState().logout()
        return
      }

      if (isAppDataHydrated()) {
        return
      }

      try {
        await hydrateAllStores()
      } catch (error) {
        if (isActive && !shouldIgnoreHydrationError(error)) {
          notifyApiErrorRef.current(error)
        }
      }
    })()

    return () => {
      isActive = false
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (currentUser?.isActive === false) {
    notification.warning({
      key: 'user-inactive',
      message: t('auth.accountDeactivated', 'Hisobingiz faolsizlashtirilgan'),
      description: t('auth.contactAdmin', 'Tizimga kirish uchun administrator bilan bog\'laning'),
      duration: 5,
    })
    logout()
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
