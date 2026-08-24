import { getStoredFileUrl } from '@/shared/api/files-api'

export function resolveMediaUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined
  }

  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  return getStoredFileUrl(value)
}

export function isStoredFileKey(value?: string | null): boolean {
  return Boolean(value && !value.startsWith('data:') && !value.startsWith('http'))
}
