import type { UploadFile } from 'antd/es/upload'
import type { ApplicationAttachment } from '@/entities/application/model/types'
import {
  deleteApplicationFile,
  getApplicationFile,
  putApplicationFile,
} from '@/entities/application/lib/attachment-storage'

function guessMimeType(fileName: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType
  }

  const extension = fileName.split('.').pop()?.toLowerCase()

  if (extension === 'pdf') {
    return 'application/pdf'
  }

  if (extension === 'png') {
    return 'image/png'
  }

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg'
  }

  return mimeType || 'application/octet-stream'
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

export async function getAttachmentBlob(attachment: ApplicationAttachment): Promise<Blob | null> {
  const storedBlob = await getApplicationFile(attachment.id)

  if (storedBlob) {
    return storedBlob
  }

  if (!attachment.dataUrl) {
    return null
  }

  const legacyBlob = dataUrlToBlob(attachment.dataUrl)

  if (legacyBlob) {
    await putApplicationFile(attachment.id, legacyBlob)
  }

  return legacyBlob
}

export function formatAttachmentSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
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
  const existingByUid = new Map(existing.map((item) => [item.id, item]))
  const next: ApplicationAttachment[] = []

  for (const file of files) {
    const originFile = file.originFileObj

    if (originFile) {
      const id = file.uid
      await putApplicationFile(id, originFile)

      next.push({
        id,
        name: file.name,
        size: originFile.size,
        mimeType: guessMimeType(file.name, originFile.type),
        kind,
      })
      continue
    }

    const existingItem = existingByUid.get(file.uid)

    if (existingItem) {
      next.push(existingItem)
    }
  }

  const nextIds = new Set(next.map((item) => item.id))

  for (const item of existing) {
    if (!nextIds.has(item.id)) {
      await deleteApplicationFile(item.id)
    }
  }

  return next
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
  const blob = await getAttachmentBlob(attachment)

  if (!blob) {
    return false
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name
  link.click()
  URL.revokeObjectURL(url)

  return true
}

export async function getAttachmentPreviewUrl(
  attachment: ApplicationAttachment,
): Promise<string | null> {
  const blob = await getAttachmentBlob(attachment)

  if (!blob) {
    return null
  }

  return URL.createObjectURL(blob)
}
