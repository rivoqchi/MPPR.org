import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import { getAccessToken } from '@/shared/lib/token-storage'

export type UploadedFileMeta = {
  id: string
  name: string
  size: number
  mimeType: string
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '')
}

export async function uploadFile(file: File | Blob, fileName: string): Promise<UploadedFileMeta> {
  const formData = new FormData()
  formData.append('file', file, fileName)

  const response = await api.post('/files/upload', formData, {
    timeout: 120_000,
  })

  return unwrapApiResponse<UploadedFileMeta>(response)
}

export function getStoredFileUrl(storageKey: string): string {
  const url = new URL(`${getApiBaseUrl()}/files/${encodeURIComponent(storageKey)}`)
  const token = getAccessToken()

  if (token) {
    url.searchParams.set('access_token', token)
  }

  return url.toString()
}

export async function fetchStoredFileBlob(storageKey: string): Promise<Blob | null> {
  try {
    const response = await api.get(`/files/${encodeURIComponent(storageKey)}`, {
      responseType: 'blob',
    })

    return response.data as Blob
  } catch {
    return null
  }
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  await api.delete(`/files/${encodeURIComponent(storageKey)}`)
}
