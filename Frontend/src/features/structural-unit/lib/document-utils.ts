import type { UploadFile } from 'antd/es/upload'
import type { StructuralUnitDocument } from '@/entities/structural-unit/model/types'
import {
  dataUrlToBlob,
  downloadStoredRecord,
  formatStoredFileSize,
  getStoredRecordBlob,
  getStoredRecordPreviewUrl,
  guessMimeType,
  isPreviewableDocument,
  persistUploadFiles,
} from '@/shared/lib/stored-file-utils'
import { isValidStorageKey } from '@/shared/lib/storage-key'

export {
  dataUrlToBlob,
  guessMimeType,
  isPreviewableDocument as isPreviewableDocument,
}

export function resolveDocumentMimeType(
  document: Pick<StructuralUnitDocument, 'name' | 'mimeType'>,
): string {
  return guessMimeType(document.name ?? '', document.mimeType)
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
    mimeType: resolveDocumentMimeType({ name, mimeType: document.mimeType ?? '' }),
    ...(document.dataUrl ? { dataUrl: document.dataUrl } : {}),
  }
}

function getUploadFileBlob(file: UploadFile): File | null {
  if (file.originFileObj instanceof File) {
    return file.originFileObj
  }

  return null
}

export async function getDocumentBlob(document: StructuralUnitDocument): Promise<Blob | null> {
  return getStoredRecordBlob(document)
}

export async function toStructuralUnitDocuments(
  files: UploadFile[],
  existingDocuments: StructuralUnitDocument[] = [],
): Promise<StructuralUnitDocument[]> {
  const normalizedExisting = normalizeStructuralUnitDocuments(existingDocuments)

  return persistUploadFiles<StructuralUnitDocument>(
    files,
    normalizedExisting,
    getUploadFileBlob,
  )
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
  return downloadStoredRecord(document)
}

export async function getDocumentPreviewUrl(
  document: StructuralUnitDocument,
): Promise<string | null> {
  return getStoredRecordPreviewUrl(document)
}

export function formatDocumentSize(size: number): string {
  return formatStoredFileSize(size)
}
