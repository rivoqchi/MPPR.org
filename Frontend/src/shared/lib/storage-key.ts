export function isValidStorageKey(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.trim().length > 0
}
