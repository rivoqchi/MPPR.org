import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  GuideVideo,
  GuideVideoFormValues,
  GuideVideoUploadInitResponse,
} from '@/features/guide/model/types'
import { getAccessToken } from '@/shared/lib/token-storage'

const CHUNK_SIZE = 8 * 1024 * 1024
const MAX_GUIDE_VIDEO_BYTES = 4 * 1024 * 1024 * 1024

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
}

function resolveGuideVideoMimeType(file: File): string {
  if (file.type) {
    return file.type
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && MIME_BY_EXTENSION[extension]) {
    return MIME_BY_EXTENSION[extension]
  }

  return 'video/mp4'
}

export async function fetchGuideVideos(): Promise<GuideVideo[]> {
  const response = await api.get('/guide-videos')
  return unwrapApiResponse<GuideVideo[]>(response)
}

export async function updateGuideVideo(
  id: string,
  data: GuideVideoFormValues,
): Promise<GuideVideo> {
  const response = await api.patch(`/guide-videos/${id}`, data)
  return unwrapApiResponse<GuideVideo>(response)
}

export async function deleteGuideVideo(id: string): Promise<void> {
  await api.delete(`/guide-videos/${id}`)
}

export async function markGuideVideoWatched(id: string): Promise<GuideVideo> {
  const response = await api.post(`/guide-videos/${id}/progress`, { watched: true })
  return unwrapApiResponse<GuideVideo>(response)
}

export function getGuideVideoStreamUrl(id: string): string {
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')
  const token = getAccessToken()
  const url = new URL(`${base}/guide-videos/${id}/stream`)
  if (token) {
    url.searchParams.set('access_token', token)
  }
  return url.toString()
}

export async function uploadGuideVideo(params: {
  title: string
  description: string
  file: File
  onProgress?: (loadedBytes: number, totalBytes: number) => void
}): Promise<GuideVideo> {
  if (params.file.size > MAX_GUIDE_VIDEO_BYTES) {
    throw new Error('GUIDE_VIDEO_FILE_TOO_LARGE')
  }

  const initResponse = await api.post('/guide-videos/upload/init', {
    title: params.title,
    description: params.description,
    fileName: params.file.name,
    mimeType: resolveGuideVideoMimeType(params.file),
    sizeBytes: params.file.size,
  })

  const init = unwrapApiResponse<GuideVideoUploadInitResponse>(initResponse)
  const chunkSize = init.chunkSizeHint || CHUNK_SIZE
  let offset = 0

  while (offset < params.file.size) {
    const end = Math.min(offset + chunkSize, params.file.size)
    const blob = params.file.slice(offset, end)

    await api.put(`/guide-videos/upload/${init.uploadId}/chunk`, blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      transformRequest: [(data) => data],
      timeout: 0,
    })

    offset = end
    params.onProgress?.(offset, params.file.size)
  }

  const completeResponse = await api.post(`/guide-videos/upload/${init.uploadId}/complete`)
  return unwrapApiResponse<GuideVideo>(completeResponse)
}

export function formatGuideVideoSizeMb(sizeBytes: number): string {
  const mb = sizeBytes / (1024 * 1024)
  if (mb < 1) {
    return `${(sizeBytes / 1024).toFixed(0)} KB`
  }
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`
}
