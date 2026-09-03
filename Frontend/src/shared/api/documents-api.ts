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
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
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

export type OnlyOfficeEditorConfig = {
  document: {
    fileType: string
    key: string
    title: string
    url: string
  }
  documentType: 'word' | 'cell' | 'slide'
  editorConfig: {
    callbackUrl: string
    mode: 'edit'
    lang: string
    user: {
      id: string
      name: string
    }
  }
  token: string
}

const ONLYOFFICE_EDITABLE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
  'txt',
  'csv',
  'pdf',
])

const ONLYOFFICE_EDITABLE_MIME_HINTS = [
  'word',
  'excel',
  'powerpoint',
  'officedocument',
  'msword',
  'ms-excel',
  'ms-powerpoint',
  'opendocument',
  'application/pdf',
  'text/plain',
  'text/csv',
]

export function isOnlyOfficeEditableFileName(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return ONLYOFFICE_EDITABLE_EXTENSIONS.has(extension)
}

export function isDocxFileName(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return extension === 'docx'
}

export function isOnlyOfficeEditableDocument(
  fileName: string,
  mimeType?: string | null,
): boolean {
  if (isOnlyOfficeEditableFileName(fileName)) {
    return true
  }

  const mime = mimeType?.toLowerCase() ?? ''
  return ONLYOFFICE_EDITABLE_MIME_HINTS.some((hint) => mime.includes(hint))
}

export function ensureDocumentTitleExtension(title: string, originalFileName: string): string {
  const trimmed = title.trim() || originalFileName
  const originalExtension = originalFileName.split('.').pop()?.toLowerCase() ?? ''
  if (!originalExtension || !ONLYOFFICE_EDITABLE_EXTENSIONS.has(originalExtension)) {
    return trimmed
  }

  const titleExtension = trimmed.includes('.')
    ? trimmed.split('.').pop()?.toLowerCase() ?? ''
    : ''

  if (titleExtension === originalExtension) {
    return trimmed
  }

  if (ONLYOFFICE_EDITABLE_EXTENSIONS.has(titleExtension)) {
    return trimmed
  }

  return `${trimmed}.${originalExtension}`
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
  isServiceFile = false,
): Promise<UserDocumentSummary> {
  const response = await api.post('/documents', { title, type, isServiceFile })
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

  const resolvedTitle = ensureDocumentTitleExtension(title?.trim() || file.name, file.name)
  formData.append('title', resolvedTitle)

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

export async function downloadDocument(documentId: string, fallbackFileName: string): Promise<void> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/download`, {
    responseType: 'blob',
  })

  const blob = await assertSuccessfulBlobResponse(response)
  const header =
    typeof response.headers['content-disposition'] === 'string'
      ? response.headers['content-disposition']
      : undefined
  const fileName = parseFilenameFromContentDisposition(header) ?? fallbackFileName

  triggerBrowserDownload(blob, fileName)
}

export async function updateDocumentServiceFile(
  documentId: string,
  isServiceFile: boolean,
): Promise<UserDocumentSummary> {
  const response = await api.patch(
    `/documents/${encodeURIComponent(documentId)}/service-file`,
    { isServiceFile },
  )
  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function fetchDocumentPreviewBlob(documentId: string): Promise<Blob> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/preview`, {
    responseType: 'blob',
    headers: {
      Accept: '*/*',
      'Content-Type': undefined,
    },
  })

  const blob = await assertSuccessfulBlobResponse(response)

  if (!blob.type || blob.type === 'application/octet-stream') {
    return new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  }

  return blob
}

/** Converted PDF for QR placement — stamp the same bytes so position matches preview. */
export async function fetchDocumentPdfPreviewBlob(documentId: string): Promise<Blob> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/pdf-preview`, {
    responseType: 'blob',
    timeout: 120_000,
    headers: {
      Accept: 'application/pdf,*/*',
      'Content-Type': undefined,
    },
  })

  const blob = await assertSuccessfulBlobResponse(response)

  if (!blob.type || blob.type === 'application/octet-stream') {
    return new Blob([blob], { type: 'application/pdf' })
  }

  return blob
}

export async function replaceDocumentFile(
  documentId: string,
  file: File,
): Promise<UserDocumentSummary> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(
    `/documents/${encodeURIComponent(documentId)}/replace-file`,
    formData,
  )

  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function getDocumentEditorConfig(
  documentId: string,
  lang: string,
): Promise<OnlyOfficeEditorConfig> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/editor-config`, {
    params: { lang },
  })

  return unwrapApiResponse<OnlyOfficeEditorConfig>(response)
}

export async function saveDocumentAsArchive(documentId: string): Promise<UserDocumentSummary> {
  const response = await api.post(`/documents/${encodeURIComponent(documentId)}/save-as-archive`)
  return unwrapApiResponse<UserDocumentSummary>(response)
}

export async function copyDocumentForAttachment(
  documentId: string,
  options?: { asPdf?: boolean },
): Promise<DocumentAttachmentCopy> {
  const response = await api.post(
    `/documents/${encodeURIComponent(documentId)}/copy-for-attachment`,
    undefined,
    {
      params: options?.asPdf ? { asPdf: 'true' } : undefined,
      timeout: 120_000,
    },
  )
  return unwrapApiResponse<DocumentAttachmentCopy>(response)
}

export type DocumentSaveState = {
  documentKey: string
  updatedAt: string
}

export async function getDocumentSaveState(documentId: string): Promise<DocumentSaveState> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/save-state`)
  return unwrapApiResponse<DocumentSaveState>(response)
}

export type InsertQrResult = DocumentSaveState & {
  editorConfig?: OnlyOfficeEditorConfig
}

export type InsertQrPlacement = {
  pageIndex: number
  offsetXMm: number
  offsetYMm: number
  sizeMm?: number
  /** Normalized 0..1 from page left/top — preferred for PDF stamp accuracy */
  xRatio?: number
  yRatio?: number
  sizeRatio?: number
}

export async function createQrPdfAttachment(
  documentId: string,
  text: string,
  placement: InsertQrPlacement,
  lang?: string,
): Promise<DocumentAttachmentCopy> {
  const response = await api.post(
    `/documents/${encodeURIComponent(documentId)}/qr-pdf-attachment`,
    {
      text,
      lang,
      pageIndex: placement.pageIndex,
      offsetXMm: placement.offsetXMm,
      offsetYMm: placement.offsetYMm,
      sizeMm: placement.sizeMm ?? 32,
      xRatio: placement.xRatio,
      yRatio: placement.yRatio,
      sizeRatio: placement.sizeRatio,
    },
    { timeout: 120_000 },
  )
  return unwrapApiResponse<DocumentAttachmentCopy>(response)
}

export async function insertQrIntoDocument(
  documentId: string,
  text: string,
  lang?: string,
  placement?: InsertQrPlacement,
): Promise<InsertQrResult> {
  const response = await api.post(`/documents/${encodeURIComponent(documentId)}/insert-qr`, {
    text,
    lang,
    ...(placement
      ? {
          pageIndex: placement.pageIndex,
          offsetXMm: placement.offsetXMm,
          offsetYMm: placement.offsetYMm,
          sizeMm: placement.sizeMm,
        }
      : {}),
  })
  return unwrapApiResponse<InsertQrResult>(response)
}

export async function createDocumentQrImageUrl(
  documentId: string,
  text: string,
): Promise<{ imageUrl: string }> {
  const response = await api.post(`/documents/${encodeURIComponent(documentId)}/qr-image`, { text })
  return unwrapApiResponse<{ imageUrl: string }>(response)
}

export async function waitForDocumentSave(
  documentId: string,
  previousDocumentKey: string,
  timeoutMs = 4_000,
  pollIntervalMs = 200,
): Promise<boolean> {
  if (!previousDocumentKey) {
    return true
  }

  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs))

    try {
      const state = await getDocumentSaveState(documentId)
      if (state.documentKey !== previousDocumentKey) {
        return true
      }
    } catch {
      // Retry until timeout.
    }
  }

  return false
}

/** Fire forcesave and wait briefly. Always resolves so UI never blocks 20s+. */
export async function softPersistDocumentSave(
  documentId: string,
  previousDocumentKey: string,
  options?: {
    hasUnsavedChanges?: boolean
    triggerSave?: () => void
    timeoutMs?: number
  },
): Promise<{ saved: boolean; documentKey: string }> {
  const timeoutMs = options?.timeoutMs ?? 4_000
  options?.triggerSave?.()

  if (!options?.hasUnsavedChanges) {
    const state = await getDocumentSaveState(documentId).catch(() => null)
    return {
      saved: true,
      documentKey: state?.documentKey ?? previousDocumentKey,
    }
  }

  const saved = await waitForDocumentSave(documentId, previousDocumentKey, timeoutMs, 200)
  const state = await getDocumentSaveState(documentId).catch(() => null)

  return {
    saved,
    documentKey: state?.documentKey ?? previousDocumentKey,
  }
}

export function getOnlyOfficeServerUrl(): string {
  return (import.meta.env.VITE_ONLYOFFICE_SERVER_URL ?? 'http://localhost:8080').replace(/\/$/, '')
}
