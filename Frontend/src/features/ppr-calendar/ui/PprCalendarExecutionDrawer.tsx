import { toApplicationAttachments } from '@/features/application-submit/lib/attachment-utils'
import type { UploadFile } from 'antd/es/upload'

export async function buildExecutionAttachments(images: UploadFile[], files: UploadFile[]) {
  const imageAttachments = await toApplicationAttachments(images, [], 'image')
  const fileAttachments = await toApplicationAttachments(files, [], 'file')

  return {
    images: imageAttachments,
    files: fileAttachments,
  }
}
