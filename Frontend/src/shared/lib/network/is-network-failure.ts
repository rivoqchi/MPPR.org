import axios from 'axios'

export function isNetworkFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }

  return !error.response
}
