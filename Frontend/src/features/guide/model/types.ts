export interface GuideVideo {
  id: string
  title: string
  description: string
  fileName: string
  mimeType: string
  sizeBytes: number
  durationSec: number | null
  sortOrder: number
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
  watched: boolean
  watchedAt: string | null
}

export interface GuideVideoUploadInitResponse {
  uploadId: string
  chunkSizeHint: number
  maxSizeBytes: number
}

export interface GuideVideoFormValues {
  title: string
  description: string
  sortOrder?: number
}
