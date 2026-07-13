const ERROR_PATHS = new Set(['/401', '/403', '/404', '/login'])

export function redirectToErrorPage(path: '/401' | '/403') {
  if (window.location.pathname === path) {
    return
  }

  window.location.assign(path)
}

export function isErrorPath(pathname: string): boolean {
  return ERROR_PATHS.has(pathname)
}
