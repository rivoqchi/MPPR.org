export function sanitizeApplicationNumberCode(shortName: string): string {
  const cleaned = shortName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9А-ЯЁЎҚҒҲӨҮ]/gi, '')
    .slice(0, 12)

  return cleaned || 'APP'
}

export function buildApplicationNumberPreview(unitShortName?: string | null): string {
  const code = sanitizeApplicationNumberCode(unitShortName ?? 'APP')
  const year = new Date().getFullYear()
  return `${code}-${year}-****`
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
