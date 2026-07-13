import type { UploadFile } from 'antd/es/upload'
import type { StructuralUnitDocument } from '@/entities/structural-unit/model/types'
import {
  deleteDocumentFile,
  getDocumentFile,
  putDocumentFile,
  putDocumentFiles,
} from '@/entities/structural-unit/lib/document-storage'
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
  document: Pick<StructuralUnitDocument, 'name' | 'mimeType'>,
): string {
  return guessMimeType(document.name ?? '', document.mimeType)
}

export function isPreviewableDocument(mimeType?: string): boolean {
  if (!mimeType) {
    return false
  }

  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

export function isStructuralUnitDocument(value: unknown): value is StructuralUnitDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const document = value as Partial<StructuralUnitDocument>

  return isValidStorageKey(document.id) && typeof document.name === 'string'
}

export function normalizeStructuralUnitDocuments(value: unknown): StructuralUnitDocument[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isStructuralUnitDocument)
    .map((document) => normalizeStructuralUnitDocument(document))
}

export function normalizeStructuralUnitDocument(
  document: Partial<StructuralUnitDocument>,
): StructuralUnitDocument {
  const name = document.name ?? 'document'
  const id = document.id ?? crypto.randomUUID()

  return {
    id,
    name,
    size: document.size ?? 0,
    mimeType: resolveDocumentMimeType({ name, mimeType: document.mimeType }),
    ...(document.dataUrl ? { dataUrl: document.dataUrl } : {}),
  }
}

function getUploadFileBlob(file: UploadFile): File | null {
  if (file.originFileObj instanceof File) {
    return file.originFileObj
  }

  return null
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

export async function getDocumentBlob(document: StructuralUnitDocument): Promise<Blob | null> {
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

export async function toStructuralUnitDocuments(
  files: UploadFile[],
  existingDocuments: StructuralUnitDocument[] = [],
): Promise<StructuralUnitDocument[]> {
  const normalizedExisting = normalizeStructuralUnitDocuments(existingDocuments)
  const existingById = new Map(normalizedExisting.map((document) => [document.id, document]))
  const nextDocuments: StructuralUnitDocument[] = []
  const filesToStore: Array<{ id: string; blob: Blob }> = []

  for (const file of files) {
    const existing = existingById.get(file.uid)
    const originFile = getUploadFileBlob(file)
    const fileId = file.uid || crypto.randomUUID()

    if (originFile) {
      filesToStore.push({ id: fileId, blob: originFile })
      nextDocuments.push({
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

        if (legacyBlob && isValidStorageKey(existing.id)) {
          filesToStore.push({ id: existing.id, blob: legacyBlob })
        }
      }

      nextDocuments.push(normalizeStructuralUnitDocument(existing))
      continue
    }

    const storedBlob = await getDocumentFile(fileId)

    if (storedBlob) {
      nextDocuments.push({
        id: fileId,
        name: file.name,
        size: storedBlob.size,
        mimeType: guessMimeType(file.name, file.type),
      })
      continue
    }
  }

  await putDocumentFiles(filesToStore)

  const nextIds = new Set(nextDocuments.map((document) => document.id))

  await Promise.all(
    normalizedExisting
      .filter((document) => !nextIds.has(document.id))
      .map((document) => deleteDocumentFile(document.id)),
  )

  return nextDocuments
}

export function toUploadFiles(documents: unknown): UploadFile[] {
  return normalizeStructuralUnitDocuments(documents).map((document) => ({
    uid: document.id,
    name: document.name,
    size: document.size,
    type: document.mimeType,
    status: 'done' as const,
  }))
}

export async function downloadStructuralUnitDocument(
  document: StructuralUnitDocument,
): Promise<boolean> {
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

export async function getDocumentPreviewUrl(
  document: StructuralUnitDocument,
): Promise<string | null> {
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
