import type { UploadFile } from 'antd/es/upload'
import type { PprTypeFile } from '@/entities/ppr-type/model/types'
import {
  downloadStoredRecord,
  formatStoredFileSize,
  getStoredRecordBlob,
  getStoredRecordPreviewUrl,
  guessMimeType,
  persistUploadFiles,
} from '@/shared/lib/stored-file-utils'
import { isValidStorageKey } from '@/shared/lib/storage-key'

export { guessMimeType }

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

function getUploadFileBlob(file: UploadFile): File | null {
  if (file.originFileObj instanceof File) {
    return file.originFileObj
  }

  return null
}

export async function getPprTypeFileBlob(file: PprTypeFile): Promise<Blob | null> {
  return getStoredRecordBlob(file)
}

export async function toPprTypeFiles(
  files: UploadFile[],
  existingFiles: PprTypeFile[] = [],
): Promise<PprTypeFile[]> {
  const normalizedExisting = normalizePprTypeFiles(existingFiles)

  return persistUploadFiles<PprTypeFile>(files, normalizedExisting, getUploadFileBlob)
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
  return downloadStoredRecord(file)
}

export async function getPprTypeFilePreviewUrl(file: PprTypeFile): Promise<string | null> {
  return getStoredRecordPreviewUrl(file)
}

export function formatFileSize(size: number): string {
  return formatStoredFileSize(size)
}

export function canOpenFilePreview(file: PprTypeFile): boolean {
  return isPreviewableFile(file.mimeType)
}
