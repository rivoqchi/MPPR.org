export const PHONE_PREFIX = '+998'

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^998/, '').slice(0, 9)
  return `${PHONE_PREFIX}${digits}`
}

export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^998/, '').slice(0, 9)
}

export function formatPhoneDisplay(phone: string): string {
  const digits = getPhoneDigits(phone)

  if (digits.length <= 2) {
    return `${PHONE_PREFIX} ${digits}`.trim()
  }

  if (digits.length <= 5) {
    return `${PHONE_PREFIX} ${digits.slice(0, 2)} ${digits.slice(2)}`
  }

  if (digits.length <= 7) {
    return `${PHONE_PREFIX} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }

  return `${PHONE_PREFIX} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`
}
