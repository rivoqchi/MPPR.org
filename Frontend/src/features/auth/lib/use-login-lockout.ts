import axios, { type AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ApiErrorResponse } from '@/shared/api/types'
import { getPhoneDigits, PHONE_PREFIX } from '@/features/users/lib/phone'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 30_000
const STORAGE_PREFIX = 'mppr-login-lockout:'

interface LoginLockoutState {
  failedAttempts: number
  lockedUntil: number
}

function normalizeLoginPhoneKey(phone: string): string {
  const digits = getPhoneDigits(phone)

  if (!digits) {
    return PHONE_PREFIX.replace(/\D/g, '')
  }

  return `998${digits}`
}

function readLockoutState(phoneKey: string): LoginLockoutState {
  if (!phoneKey) {
    return { failedAttempts: 0, lockedUntil: 0 }
  }

  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${phoneKey}`)

    if (!raw) {
      return { failedAttempts: 0, lockedUntil: 0 }
    }

    const parsed = JSON.parse(raw) as Partial<LoginLockoutState>

    return {
      failedAttempts: typeof parsed.failedAttempts === 'number' ? parsed.failedAttempts : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
    }
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 }
  }
}

function writeLockoutState(phoneKey: string, state: LoginLockoutState): void {
  if (!phoneKey) {
    return
  }

  if (state.failedAttempts === 0 && state.lockedUntil === 0) {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${phoneKey}`)
    return
  }

  sessionStorage.setItem(`${STORAGE_PREFIX}${phoneKey}`, JSON.stringify(state))
}

function getRemainingSeconds(lockedUntil: number): number {
  if (!lockedUntil) {
    return 0
  }

  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
}

export function extractLoginRetryAfterSeconds(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  const payload = error.response?.data as ApiErrorResponse | undefined

  if (!payload || payload.success !== false) {
    return null
  }

  if (typeof payload.retryAfterSeconds === 'number' && Number.isFinite(payload.retryAfterSeconds)) {
    return Math.max(0, Math.ceil(payload.retryAfterSeconds))
  }

  if (payload.code === 'LOGIN_TEMPORARILY_LOCKED') {
    return 30
  }

  return null
}

export function useLoginLockout(phone: string) {
  const phoneKey = useMemo(() => normalizeLoginPhoneKey(phone), [phone])
  const [state, setState] = useState<LoginLockoutState>(() => readLockoutState(phoneKey))
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(readLockoutState(phoneKey).lockedUntil),
  )

  useEffect(() => {
    const nextState = readLockoutState(phoneKey)
    setState(nextState)
    setRemainingSeconds(getRemainingSeconds(nextState.lockedUntil))
  }, [phoneKey])

  useEffect(() => {
    if (!state.lockedUntil) {
      setRemainingSeconds(0)
      return
    }

    const tick = () => {
      const seconds = getRemainingSeconds(state.lockedUntil)

      setRemainingSeconds(seconds)

      if (seconds <= 0) {
        const clearedState = { failedAttempts: 0, lockedUntil: 0 }
        setState(clearedState)
        writeLockoutState(phoneKey, clearedState)
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)

    return () => window.clearInterval(timer)
  }, [phoneKey, state.lockedUntil])

  const isLocked = remainingSeconds > 0

  const clearLockout = useCallback(() => {
    const clearedState = { failedAttempts: 0, lockedUntil: 0 }
    setState(clearedState)
    setRemainingSeconds(0)
    writeLockoutState(phoneKey, clearedState)
  }, [phoneKey])

  const registerFailedAttempt = useCallback(() => {
    const current = readLockoutState(phoneKey)
    const now = Date.now()

    if (current.lockedUntil > now) {
      const seconds = getRemainingSeconds(current.lockedUntil)
      setState(current)
      setRemainingSeconds(seconds)
      return { locked: true, retryAfterSeconds: seconds }
    }

    const failedAttempts = (current.lockedUntil > 0 && current.lockedUntil <= now ? 0 : current.failedAttempts) + 1

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const nextState = { failedAttempts: 0, lockedUntil: now + LOCK_DURATION_MS }
      setState(nextState)
      setRemainingSeconds(Math.ceil(LOCK_DURATION_MS / 1000))
      writeLockoutState(phoneKey, nextState)
      return { locked: true, retryAfterSeconds: Math.ceil(LOCK_DURATION_MS / 1000) }
    }

    const nextState = { failedAttempts, lockedUntil: 0 }
    setState(nextState)
    writeLockoutState(phoneKey, nextState)
    return { locked: false, retryAfterSeconds: 0 }
  }, [phoneKey])

  const applyServerLockout = useCallback(
    (retryAfterSeconds: number) => {
      const nextState = {
        failedAttempts: 0,
        lockedUntil: Date.now() + retryAfterSeconds * 1000,
      }
      setState(nextState)
      setRemainingSeconds(retryAfterSeconds)
      writeLockoutState(phoneKey, nextState)
    },
    [phoneKey],
  )

  return {
    isLocked,
    remainingSeconds,
    clearLockout,
    registerFailedAttempt,
    applyServerLockout,
  }
}
