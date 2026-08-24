import type { UploadFile } from 'antd/es/upload'
import {
  deleteStoredFileByKey,
  getStoredFile,
  putStoredFile,
} from '@/shared/lib/file-storage'
import { getStoredFileUrl } from '@/shared/api/files-api'
import { isStoredFileKey, resolveMediaUrl } from '@/shared/lib/resolve-media-url'
import { isValidStorageKey } from '@/shared/lib/storage-key'

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export function guessMimeType(fileName: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType
  }

  const extension = fileName.split('.').pop()?.toLowerCase()

  if (extension && MIME_TYPES_BY_EXTENSION[extension]) {
    return MIME_TYPES_BY_EXTENSION[extension]
  }

  return mimeType || 'application/octet-stream'
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!match) {
    return null
  }

  const mimeType = match[1]
  const base64 = match[2]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

export type StoredFileRecord = {
  id: string
  name: string
  size: number
  mimeType: string
  dataUrl?: string
}

export function isPreviewableDocument(mimeType?: string): boolean {
  if (!mimeType) {
    return false
  }

  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

export async function getStoredRecordBlob(record: StoredFileRecord): Promise<Blob | null> {
  if (isStoredFileKey(record.id)) {
    const blob = await getStoredFile(record.id)

    if (blob) {
      return blob
    }
  }

  if (!record.dataUrl) {
    return null
  }

  return dataUrlToBlob(record.dataUrl)
}

export function getStoredRecordPreviewUrl(record: StoredFileRecord): string | null {
  if (record.dataUrl && !isStoredFileKey(record.id)) {
    return record.dataUrl
  }

  if (isValidStorageKey(record.id) && isStoredFileKey(record.id)) {
    return getStoredFileUrl(record.id)
  }

  return resolveMediaUrl(record.dataUrl) ?? null
}

export async function uploadStoredRecordBlob(
  blob: Blob,
  name: string,
  mimeType: string,
): Promise<StoredFileRecord> {
  const uploaded = await putStoredFile(blob, name)

  return {
    id: uploaded.id,
    name: uploaded.name,
    size: uploaded.size,
    mimeType: uploaded.mimeType || mimeType,
  }
}

export async function persistUploadFiles<T extends StoredFileRecord>(
  files: UploadFile[],
  existingRecords: T[] = [],
  getUploadFileBlob: (file: UploadFile) => File | null = (file) =>
    file.originFileObj instanceof File ? file.originFileObj : null,
): Promise<T[]> {
  const existingById = new Map(existingRecords.map((record) => [record.id, record]))
  const nextRecords: T[] = []

  for (const file of files) {
    const existing = existingById.get(file.uid)
    const originFile = getUploadFileBlob(file)

    if (originFile) {
      const uploaded = await uploadStoredRecordBlob(
        originFile,
        file.name || originFile.name,
        guessMimeType(file.name || originFile.name, originFile.type || file.type),
      )
      nextRecords.push(uploaded as T)
      continue
    }

    if (existing) {
      if (existing.dataUrl && !isStoredFileKey(existing.id)) {
        const legacyBlob = dataUrlToBlob(existing.dataUrl)

        if (legacyBlob) {
          const uploaded = await uploadStoredRecordBlob(
            legacyBlob,
            existing.name,
            existing.mimeType,
          )
          nextRecords.push({ ...existing, ...uploaded } as T)
          continue
        }
      }

      nextRecords.push(existing)
    }
  }

  const nextIds = new Set(nextRecords.map((record) => record.id))

  await Promise.all(
    existingRecords
      .filter((record) => !nextIds.has(record.id) && isStoredFileKey(record.id))
      .map((record) => deleteStoredFileByKey(record.id)),
  )

  return nextRecords
}

export async function downloadStoredRecord(record: StoredFileRecord): Promise<boolean> {
  const blob = await getStoredRecordBlob(record)

  if (!blob) {
    return false
  }

  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = record.name
  link.rel = 'noopener'
  link.click()
  URL.revokeObjectURL(url)

  return true
}

export function formatStoredFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
