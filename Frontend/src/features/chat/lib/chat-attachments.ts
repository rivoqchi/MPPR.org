import { getStoredFileUrl } from '@/shared/api/files-api'
import type { ChatAttachment, ChatAttachmentKind } from '@/entities/chat/model/types'

export function resolveAttachmentKind(mimeType: string, explicit?: ChatAttachmentKind): ChatAttachmentKind {
  if (explicit) {
    return explicit
  }

  if (mimeType.startsWith('image/')) {
    return 'image'
  }

  if (mimeType.startsWith('video/')) {
    return 'video'
  }

  if (mimeType.startsWith('audio/')) {
    return 'voice'
  }

  return 'file'
}

export function toChatAttachment(
  meta: { id: string; name: string; size: number; mimeType: string },
  kind?: ChatAttachmentKind,
  durationSec?: number,
): ChatAttachment {
  return {
    id: meta.id,
    name: meta.name,
    size: meta.size,
    mimeType: meta.mimeType,
    kind: resolveAttachmentKind(meta.mimeType, kind),
    ...(typeof durationSec === 'number' ? { durationSec } : {}),
  }
}

export function getChatAttachmentUrl(attachment: ChatAttachment): string {
  return getStoredFileUrl(attachment.id)
}

export function formatChatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatVoiceDuration(seconds?: number): string {
  const value = Math.max(0, Math.round(seconds ?? 0))
  const mins = Math.floor(value / 60)
  const secs = value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function previewMessageText(
  content: string,
  attachments: ChatAttachment[],
  labels: {
    voiceMessage: string
    photo: string
    video: string
    file: string
    deleted: string
  },
  deleted?: boolean,
): string {
  if (deleted) {
    return labels.deleted
  }

  if (content.trim()) {
    return content
  }

  const first = attachments[0]

  if (!first) {
    return ''
  }

  if (first.kind === 'voice') {
    return labels.voiceMessage
  }

  if (first.kind === 'image') {
    return labels.photo
  }

  if (first.kind === 'video') {
    return labels.video
  }

  return first.name || labels.file
}
