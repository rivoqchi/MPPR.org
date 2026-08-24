import {
  deleteStoredFile,
  fetchStoredFileBlob,
  uploadFile,
  type UploadedFileMeta,
} from '@/shared/api/files-api'
import { isValidStorageKey } from '@/shared/lib/storage-key'

export type { UploadedFileMeta }

export async function putStoredFile(
  file: Blob,
  fileName: string,
): Promise<UploadedFileMeta> {
  const uploadName = fileName.trim() || 'file'
  const fileObject =
    file instanceof File ? file : new File([file], uploadName, { type: file.type || undefined })

  return uploadFile(fileObject, uploadName)
}

export async function getStoredFile(storageKey: string): Promise<Blob | null> {
  if (!isValidStorageKey(storageKey)) {
    return null
  }

  return fetchStoredFileBlob(storageKey)
}

export async function deleteStoredFileByKey(storageKey: string): Promise<void> {
  if (!isValidStorageKey(storageKey)) {
    return
  }

  await deleteStoredFile(storageKey)
}

export async function putStoredFiles(
  files: Array<{ blob: Blob; name: string }>,
): Promise<UploadedFileMeta[]> {
  return Promise.all(files.map((file) => putStoredFile(file.blob, file.name)))
}
