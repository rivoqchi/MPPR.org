const DEFAULT_TIMEOUT_MS = 8_000

export async function checkServerConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(
      /\/$/,
      '',
    )

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })

    window.clearTimeout(timeoutId)

    return response.ok
  } catch {
    return false
  }
}
