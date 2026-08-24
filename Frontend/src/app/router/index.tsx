import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { appRoutes } from '@/app/router/routes'
import { lazyRoute } from '@/app/router/lazy-route'
import { LoginPage } from '@/features/auth/ui/LoginPage'
import { MainLayout } from '@/widgets/layout/MainLayout'

const UnauthorizedPage = lazy(() =>
  import('@/features/error/ui/UnauthorizedPage').then((module) => ({
    default: module.UnauthorizedPage,
  })),
)

const ForbiddenPage = lazy(() =>
  import('@/features/error/ui/ForbiddenPage').then((module) => ({
    default: module.ForbiddenPage,
  })),
)

const NotFoundPage = lazy(() =>
  import('@/features/error/ui/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

const RouteErrorPage = lazy(() =>
  import('@/features/error/ui/RouteErrorPage').then((module) => ({
    default: module.RouteErrorPage,
  })),
)

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: lazyRoute(<RouteErrorPage />),
  },
  {
    path: '/401',
    element: lazyRoute(<UnauthorizedPage />),
    errorElement: lazyRoute(<RouteErrorPage />),
  },
  {
    path: '/403',
    element: lazyRoute(<ForbiddenPage />),
    errorElement: lazyRoute(<RouteErrorPage />),
  },
  {
    path: '/404',
    element: lazyRoute(<NotFoundPage />),
    errorElement: lazyRoute(<RouteErrorPage />),
  },
  {
    element: <ProtectedRoute />,
    errorElement: lazyRoute(<RouteErrorPage />),
    children: [
      {
        path: '/',
        element: <MainLayout />,
        errorElement: lazyRoute(<RouteErrorPage />),
        children: [
          ...appRoutes,
          {
            path: '*',
            element: lazyRoute(<NotFoundPage />),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: lazyRoute(<NotFoundPage />),
    errorElement: lazyRoute(<RouteErrorPage />),
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
