import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AntdProvider } from '@/app/providers/AntdProvider'
import { AuthSessionProvider } from '@/app/providers/AuthSessionProvider'
import { NetworkStatusProvider } from '@/app/providers/NetworkStatusProvider'
import { RealtimeProvider } from '@/app/providers/RealtimeProvider'
import { ClientErrorReporterProvider } from '@/app/providers/ClientErrorReporterProvider'
import '@/shared/lib/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AntdProvider>
        <AuthSessionProvider />
        <NetworkStatusProvider />
        <RealtimeProvider />
        <ClientErrorReporterProvider />
        {children}
      </AntdProvider>
    </QueryClientProvider>
  )
}
