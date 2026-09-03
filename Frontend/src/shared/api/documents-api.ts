import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'

export type UserDocumentType = 'FILE' | 'ARCHIVE'

export type UserDocumentSummary = {
  id: string
  title: string
  storageKey: string
  type: UserDocumentType
  isServiceFile: boolean
  createdById: string
  size: number
  mimeType: string
  createdAt: string
  updatedAt: string
}

export type DocumentAttachmentCopy = {
  id: string
  name: string
  size: number
  mimeType: string
}

const DOCX_EXTENSIONS = new Set(['docx'])
const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/docx',
])

export function isDocxFileName(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return DOCX_EXTENSIONS.has(extension)
}

export function isDocxDocument(document: {
  title: string
  mimeType?: string | null
  storageKey?: string | null
}): boolean {
  if (isDocxFileName(document.title)) {
    return true
  }

  if (document.storageKey && isDocxFileName(document.storageKey)) {
    return true
  }

  const mimeType = document.mimeType?.toLowerCase().trim()
  if (mimeType && DOCX_MIME_TYPES.has(mimeType)) {
    return true
  }

  return false
}

/** @deprecated Use isDocxFileName / isDocxDocument */
export function isOnlyOfficeEditableFileName(fileName: string): boolean {
  return isDocxFileName(fileName)
}

function parseFilenameFromContentDisposition(header: string | undefined): string | null {
  if (!header) {
    return null
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;\n]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const asciiMatch = header.match(/filename="([^"]+)"/i) ?? header.match(/filename=([^;\n]+)/i)
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim()
  }

  return null
}

async function readBlobErrorMessage(blob: Blob): Promise<string | null> {
  if (!blob.type.includes('json') && blob.type !== 'application/json') {
    return null
  }

  try {
    const text = await blob.text()
    const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } }
    return parsed.message ?? parsed.error?.message ?? text
  } catch {
    return null
  }
}

async function assertSuccessfulBlobResponse(response: { data: Blob; headers: Record<string, unknown> }) {
  const blob = response.data

  if (blob.type.includes('json')) {
    const message = await readBlobErrorMessage(blob)
    if (message) {
      throw new Error(message)
    }
  }

  return blob
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 250)
}

export async function listDocuments(type?: UserDocumentType): Promise<UserDocumentSummary[]> {
  const response = await api.get('/documents', {
    params: type ? { type } : undefined,
  })
  return unwrapApiResponse<UserDocumentSummary[]>(response)
}

export async function getDocumentById(documentId: string): Promise<UserDocumentSummary> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}`)
  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function createDocument(
  title?: string,
  type: UserDocumentType = 'FILE',
): Promise<UserDocumentSummary> {
  const response = await api.post('/documents', { title, type })
  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function uploadDocument(
  file: File,
  title?: string,
  type: UserDocumentType = 'FILE',
  isServiceFile = false,
): Promise<UserDocumentSummary> {
  const formData = new FormData()
  formData.append('file', file)

  if (title?.trim()) {
    formData.append('title', title.trim())
  }

  formData.append('type', type)

  if (isServiceFile) {
    formData.append('isServiceFile', 'true')
  }

  const response = await api.post('/documents/upload', formData)
  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${encodeURIComponent(documentId)}`)
}

export async function downloadDocument(documentId: string, fileName?: string): Promise<void> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/download`, {
    responseType: 'blob',
  })

  const blob = await assertSuccessfulBlobResponse(response)
  const resolvedName =
    fileName ??
    parseFilenameFromContentDisposition(response.headers['content-disposition'] as string | undefined) ??
    'document.docx'

  triggerBrowserDownload(blob, resolvedName)
}

export async function fetchDocumentPreviewBlob(documentId: string): Promise<Blob> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/preview`, {
    responseType: 'blob',
  })

  return assertSuccessfulBlobResponse(response)
}

export async function replaceDocumentFile(
  documentId: string,
  file: File,
  title?: string,
): Promise<UserDocumentSummary> {
  const formData = new FormData()
  formData.append('file', file)

  if (title?.trim()) {
    formData.append('title', title.trim())
  }

  const response = await api.post(
    `/documents/${encodeURIComponent(documentId)}/replace-file`,
    formData,
  )

  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function saveDocumentDocxBytes(
  documentId: string,
  bytes: Uint8Array,
  title: string,
): Promise<UserDocumentSummary> {
  const normalizedBytes = new Uint8Array(bytes)
  const file = new File([normalizedBytes], title, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  return replaceDocumentFile(documentId, file, title)
}

export async function saveDocumentAsArchive(documentId: string): Promise<UserDocumentSummary> {
  const response = await api.post(`/documents/${encodeURIComponent(documentId)}/save-as-archive`)
  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function copyDocumentForAttachment(
  documentId: string,
): Promise<DocumentAttachmentCopy> {
  const response = await api.post(
    `/documents/${encodeURIComponent(documentId)}/copy-for-attachment`,
  )
  return unwrapApiResponse<DocumentAttachmentCopy>(response)
}

export type InsertQrResult = {
  documentKey: string
  updatedAt: string
}

export async function insertQrIntoDocument(
  documentId: string,
  text: string,
): Promise<InsertQrResult> {
  const response = await api.post(`/documents/${encodeURIComponent(documentId)}/insert-qr`, {
    text,
  })
  return unwrapApiResponse<InsertQrResult>(response)
}
