import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/shared/api/types'

export function unwrapApiResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data
}
