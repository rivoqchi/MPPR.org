import type { UploadFile } from 'antd/es/upload'
import type { ObjectDocument } from '@/entities/object/model/types'
import {
  downloadStoredRecord,
  formatStoredFileSize,
  getStoredRecordBlob,
  getStoredRecordPreviewUrl,
  guessMimeType,
  isPreviewableDocument,
  persistUploadFiles,
} from '@/shared/lib/stored-file-utils'

export {
  guessMimeType,
  isPreviewableDocument,
}

export function resolveDocumentMimeType(
  document: Pick<ObjectDocument, 'name' | 'mimeType'>,
): string {
  return guessMimeType(document.name ?? '', document.mimeType)
}

export async function getDocumentBlob(document: ObjectDocument): Promise<Blob | null> {
  return getStoredRecordBlob(document)
}

export async function toObjectDocuments(
  files: UploadFile[],
  existingDocuments: ObjectDocument[] = [],
): Promise<ObjectDocument[]> {
  return persistUploadFiles<ObjectDocument>(files, existingDocuments)
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
  return downloadStoredRecord(document)
}

export async function getDocumentPreviewUrl(document: ObjectDocument): Promise<string | null> {
  return getStoredRecordPreviewUrl(document)
}

export function formatDocumentSize(size: number): string {
  return formatStoredFileSize(size)
}
