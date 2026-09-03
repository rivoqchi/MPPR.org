const BACKEND_STORAGE_KEY_PATTERN = /^[a-f0-9-]{36}(\.[a-z0-9]+)?$/i

export function isValidStorageKey(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

export function isBackendStorageKey(id: string | undefined | null): boolean {
  return typeof id === 'string' && BACKEND_STORAGE_KEY_PATTERN.test(id.trim())
}
