import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30_000;

interface LoginAttemptState {
  failedAttempts: number;
  lockedUntil: number;
}

export function normalizeLoginPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('998')) {
    return digits;
  }

  return `998${digits}`;
}

@Injectable()
export class LoginAttemptGuard {
  private readonly attempts = new Map<string, LoginAttemptState>();

  assertNotLocked(phoneKey: string): void {
    const state = this.attempts.get(phoneKey);

    if (!state?.lockedUntil) {
      return;
    }

    const remainingMs = state.lockedUntil - Date.now();

    if (remainingMs <= 0) {
      this.attempts.delete(phoneKey);
      return;
    }

    throw this.createLockedException(Math.ceil(remainingMs / 1000));
  }

  recordFailure(phoneKey: string): { locked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const current = this.attempts.get(phoneKey);

    if (current?.lockedUntil && current.lockedUntil > now) {
      return {
        locked: true,
        retryAfterSeconds: Math.ceil((current.lockedUntil - now) / 1000),
      };
    }

    const failedAttempts = (current?.lockedUntil && current.lockedUntil <= now ? 0 : current?.failedAttempts ?? 0) + 1;

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = now + LOCK_DURATION_MS;
      this.attempts.set(phoneKey, { failedAttempts: 0, lockedUntil });

      return {
        locked: true,
        retryAfterSeconds: Math.ceil(LOCK_DURATION_MS / 1000),
      };
    }

    this.attempts.set(phoneKey, { failedAttempts, lockedUntil: 0 });

    return { locked: false, retryAfterSeconds: 0 };
  }

  reset(phoneKey: string): void {
    this.attempts.delete(phoneKey);
  }

  createLockedException(retryAfterSeconds: number): HttpException {
    return new HttpException(
      {
        message: ErrorCode.LOGIN_TEMPORARILY_LOCKED,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
