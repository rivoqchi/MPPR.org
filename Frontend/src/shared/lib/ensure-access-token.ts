import axios from 'axios'
import { unwrapApiResponse } from '@/shared/api/client'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/shared/lib/token-storage'

function isAccessTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number }

    if (!payload.exp) {
      return false
    }

    return payload.exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

export async function ensureValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken()

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return accessToken
  }

  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    return accessToken
  }

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )

    const tokens = unwrapApiResponse<{ accessToken: string; refreshToken: string }>(response)
    setTokens(tokens.accessToken, tokens.refreshToken)

    return tokens.accessToken
  } catch {
    clearTokens()
    return null
  }
}
