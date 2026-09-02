/** OnlyOffice Document Server supports en, ru, etc. — not uz. */
export function resolveOnlyOfficeLang(language: string): string {
  if (language.startsWith('ru')) {
    return 'ru'
  }

  if (language.startsWith('en')) {
    return 'en'
  }

  return 'en'
}
