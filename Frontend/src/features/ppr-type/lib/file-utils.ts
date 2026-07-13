import type { UploadFile } from 'antd/es/upload'
import type { PprTypeFile } from '@/entities/ppr-type/model/types'
import {
  deletePprTypeFile,
  getPprTypeFile,
  putPprTypeFile,
  putPprTypeFiles,
} from '@/entities/ppr-type/lib/file-storage'
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

export function isPreviewableFile(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

function isPprTypeFile(value: unknown): value is PprTypeFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const file = value as Partial<PprTypeFile>

  return isValidStorageKey(file.id) && typeof file.name === 'string'
}

export function normalizePprTypeFile(file: Partial<PprTypeFile>): PprTypeFile {
  const name = file.name ?? 'file'
  const id = file.id ?? crypto.randomUUID()

  return {
    id,
    name,
    size: file.size ?? 0,
    mimeType: guessMimeType(name, file.mimeType),
    ...(file.dataUrl ? { dataUrl: file.dataUrl } : {}),
  }
}

export function normalizePprTypeFiles(value: unknown): PprTypeFile[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isPprTypeFile).map((file) => normalizePprTypeFile(file))
}

function dataUrlToBlob(dataUrl: string): Blob | null {
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

function getUploadFileBlob(file: UploadFile): File | null {
  if (file.originFileObj instanceof File) {
    return file.originFileObj
  }

  return null
}

export async function getPprTypeFileBlob(file: PprTypeFile): Promise<Blob | null> {
  if (!isValidStorageKey(file.id)) {
    return null
  }

  const storedBlob = await getPprTypeFile(file.id)

  if (storedBlob) {
    return storedBlob
  }

  if (!file.dataUrl) {
    return null
  }

  const legacyBlob = dataUrlToBlob(file.dataUrl)

  if (legacyBlob) {
    await putPprTypeFile(file.id, legacyBlob)
  }

  return legacyBlob
}

export async function toPprTypeFiles(
  files: UploadFile[],
  existingFiles: PprTypeFile[] = [],
): Promise<PprTypeFile[]> {
  const normalizedExisting = normalizePprTypeFiles(existingFiles)
  const existingById = new Map(normalizedExisting.map((file) => [file.id, file]))
  const nextFiles: PprTypeFile[] = []
  const filesToStore: Array<{ id: string; blob: Blob }> = []

  for (const file of files) {
    const existing = existingById.get(file.uid)
    const originFile = getUploadFileBlob(file)
    const fileId = file.uid || crypto.randomUUID()

    if (originFile) {
      filesToStore.push({ id: fileId, blob: originFile })
      nextFiles.push({
        id: fileId,
        name: file.name || originFile.name,
        size: originFile.size,
        mimeType: guessMimeType(file.name || originFile.name, originFile.type || file.type),
      })
      continue
    }

    if (existing) {
      if (existing.dataUrl) {
        const legacyBlob = dataUrlToBlob(existing.dataUrl)

        if (legacyBlob) {
          filesToStore.push({ id: existing.id, blob: legacyBlob })
        }
      }

      nextFiles.push({
        id: existing.id,
        name: existing.name,
        size: existing.size,
        mimeType: existing.mimeType,
      })
      continue
    }

    const storedBlob = await getPprTypeFile(fileId)

    if (storedBlob) {
      nextFiles.push({
        id: fileId,
        name: file.name,
        size: storedBlob.size,
        mimeType: guessMimeType(file.name, file.type),
      })
      continue
    }

    nextFiles.push({
      id: fileId,
      name: file.name,
      size: file.size ?? 0,
      mimeType: guessMimeType(file.name, file.type),
    })
  }

  await putPprTypeFiles(filesToStore)

  const nextIds = new Set(nextFiles.map((item) => item.id))

  await Promise.all(
    normalizedExisting
      .filter((item) => !nextIds.has(item.id))
      .map((item) => deletePprTypeFile(item.id)),
  )

  return nextFiles
}

export function toUploadFiles(files: PprTypeFile[]): UploadFile[] {
  return normalizePprTypeFiles(files).map((file) => ({
    uid: file.id,
    name: file.name,
    size: file.size,
    type: file.mimeType,
    status: 'done' as const,
  }))
}

export async function downloadPprTypeFile(file: PprTypeFile): Promise<boolean> {
  const blob = await getPprTypeFileBlob(file)

  if (!blob) {
    return false
  }

  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = file.name
  link.rel = 'noopener'
  link.click()
  URL.revokeObjectURL(url)

  return true
}

export async function getPprTypeFilePreviewUrl(file: PprTypeFile): Promise<string | null> {
  const blob = await getPprTypeFileBlob(file)

  if (!blob) {
    return null
  }

  return URL.createObjectURL(blob)
}

export function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function canOpenFilePreview(file: PprTypeFile): boolean {
  return isPreviewableFile(file.mimeType)
}
