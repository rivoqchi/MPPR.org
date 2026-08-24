import type { UploadFile } from 'antd/es/upload'
import type { ApplicationAttachment } from '@/entities/application/model/types'
import {
  downloadStoredRecord,
  formatStoredFileSize,
  getStoredRecordBlob,
  getStoredRecordPreviewUrl,
  guessMimeType,
  persistUploadFiles,
} from '@/shared/lib/stored-file-utils'

function getUploadFileBlob(file: UploadFile): File | null {
  if (file.originFileObj instanceof File && file.originFileObj.size > 0) {
    return file.originFileObj
  }

  return null
}

export async function getAttachmentBlob(attachment: ApplicationAttachment): Promise<Blob | null> {
  return getStoredRecordBlob(attachment)
}

export function formatAttachmentSize(size: number): string {
  return formatStoredFileSize(size)
}

export function isImageAttachment(attachment: ApplicationAttachment): boolean {
  return attachment.kind === 'image' || attachment.mimeType.startsWith('image/')
}

export function isPreviewableAttachment(attachment: ApplicationAttachment): boolean {
  return isImageAttachment(attachment) || attachment.mimeType === 'application/pdf'
}

export async function toApplicationAttachments(
  files: UploadFile[],
  existing: ApplicationAttachment[],
  kind: ApplicationAttachment['kind'],
): Promise<ApplicationAttachment[]> {
  const records = await persistUploadFiles(
    files,
    existing,
    getUploadFileBlob,
  )

  return records.map((record) => ({
    ...record,
    kind,
    mimeType: guessMimeType(record.name, record.mimeType),
  }))
}

export function toUploadFiles(attachments: ApplicationAttachment[]): UploadFile[] {
  return attachments.map((attachment) => ({
    uid: attachment.id,
    name: attachment.name,
    size: attachment.size,
    type: attachment.mimeType,
    status: 'done' as const,
  }))
}

export async function downloadApplicationAttachment(
  attachment: ApplicationAttachment,
): Promise<boolean> {
  return downloadStoredRecord(attachment)
}

export async function getAttachmentPreviewUrl(
  attachment: ApplicationAttachment,
): Promise<string | null> {
  return getStoredRecordPreviewUrl(attachment)
}
