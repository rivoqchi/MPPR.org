import { useEffect } from 'react'
import { syncAuthSession } from '@/shared/lib/auth-session'

export function AuthSessionProvider() {
  useEffect(() => {
    syncAuthSession()
  }, [])

  return null
}
