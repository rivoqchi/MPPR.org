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

export function isOnlyOfficeEditableFileName(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return ONLYOFFICE_EDITABLE_EXTENSIONS.has(extension)
}

export async function listDocuments(type?: UserDocumentType): Promise<UserDocumentSummary[]> {
  const response = await api.get('/documents', {
    params: type ? { type } : undefined,
  })
  return unwrapApiResponse<UserDocumentSummary[]>(response)
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

export async function downloadDocument(documentId: string, fileName: string): Promise<void> {
  const response = await api.get(`/documents/${encodeURIComponent(documentId)}/download`, {
    responseType: 'blob',
  })

  const blob = response.data as Blob
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.click()
  URL.revokeObjectURL(url)
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
): Promise<DocumentAttachmentCopy> {
  const response = await api.post(
    `/documents/${encodeURIComponent(documentId)}/copy-for-attachment`,
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
  editorConfig: OnlyOfficeEditorConfig
}

export async function insertQrIntoDocument(
  documentId: string,
  text: string,
  lang?: string,
): Promise<InsertQrResult> {
  const response = await api.post(`/documents/${encodeURIComponent(documentId)}/insert-qr`, {
    text,
    lang,
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
  timeoutMs = 20_000,
  pollIntervalMs = 600,
): Promise<boolean> {
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

export function getOnlyOfficeServerUrl(): string {
  return (import.meta.env.VITE_ONLYOFFICE_SERVER_URL ?? 'http://localhost:8080').replace(/\/$/, '')
}
