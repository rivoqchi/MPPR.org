import type { UploadFile } from 'antd/es/upload'
import type { ObjectDocument } from '@/entities/object/model/types'
import {
  deleteDocumentFile,
  getDocumentFile,
  putDocumentFile,
  putDocumentFiles,
} from '@/entities/object/lib/document-storage'
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

export function resolveDocumentMimeType(
  document: Pick<ObjectDocument, 'name' | 'mimeType'>,
): string {
  return guessMimeType(document.name ?? '', document.mimeType)
}

export function isPreviewableDocument(mimeType?: string): boolean {
  if (!mimeType) {
    return false
  }

  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
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

export async function getDocumentBlob(document: ObjectDocument): Promise<Blob | null> {
  if (!isValidStorageKey(document.id)) {
    return null
  }

  const storedBlob = await getDocumentFile(document.id)

  if (storedBlob) {
    return storedBlob
  }

  if (!document.dataUrl) {
    return null
  }

  const legacyBlob = dataUrlToBlob(document.dataUrl)

  if (legacyBlob) {
    await putDocumentFile(document.id, legacyBlob)
  }

  return legacyBlob
}

export async function toObjectDocuments(
  files: UploadFile[],
  existingDocuments: ObjectDocument[] = [],
): Promise<ObjectDocument[]> {
  const existingById = new Map(existingDocuments.map((document) => [document.id, document]))
  const nextDocuments: ObjectDocument[] = []
  const filesToStore: Array<{ id: string; blob: Blob }> = []

  for (const file of files) {
    const existing = existingById.get(file.uid)
    const originFile = file.originFileObj as File | undefined

    if (originFile) {
      filesToStore.push({ id: file.uid, blob: originFile })
      nextDocuments.push({
        id: file.uid,
        name: file.name,
        size: originFile.size,
        mimeType: guessMimeType(file.name, originFile.type || file.type),
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

      nextDocuments.push({
        id: existing.id,
        name: existing.name,
        size: existing.size,
        mimeType: existing.mimeType,
      })
      continue
    }

    nextDocuments.push({
      id: file.uid,
      name: file.name,
      size: file.size ?? 0,
      mimeType: guessMimeType(file.name, file.type),
    })
  }

  await putDocumentFiles(filesToStore)

  const nextIds = new Set(nextDocuments.map((document) => document.id))

  await Promise.all(
    existingDocuments
      .filter((document) => !nextIds.has(document.id))
      .map((document) => deleteDocumentFile(document.id)),
  )

  return nextDocuments
}

export function toUploadFiles(documents: ObjectDocument[]): UploadFile[] {
  return documents.map((document) => ({
    uid: document.id,
    name: document.name,
    size: document.size,
    type: document.mimeType,
    status: 'done' as const,
  }))
}

export async function downloadObjectDocument(document: ObjectDocument): Promise<boolean> {
  const blob = await getDocumentBlob(document)

  if (!blob) {
    return false
  }

  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = document.name
  link.rel = 'noopener'
  link.click()
  URL.revokeObjectURL(url)

  return true
}

export async function getDocumentPreviewUrl(document: ObjectDocument): Promise<string | null> {
  const blob = await getDocumentBlob(document)

  if (!blob) {
    return null
  }

  return URL.createObjectURL(blob)
}

export function formatDocumentSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
