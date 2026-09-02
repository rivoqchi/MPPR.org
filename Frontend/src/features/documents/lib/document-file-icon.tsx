import {
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

export function getDocumentFileIcon(fileName: string, mimeType?: string): ReactNode {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) {
    return <FileImageOutlined />
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return <FilePdfOutlined />
  }

  if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
    return <FileWordOutlined />
  }

  if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) {
    return <FileExcelOutlined />
  }

  if (['ppt', 'pptx', 'odp'].includes(extension)) {
    return <FilePptOutlined />
  }

  if (extension === 'txt') {
    return <FileTextOutlined />
  }

  return <FileOutlined />
}
