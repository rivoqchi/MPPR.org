import type { Editor } from '@tiptap/react'
import { App } from 'antd'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  isSupportedDocumentImage,
  uploadDocumentImage,
} from '@/features/documents/lib/document-image-upload'

export function useDocumentMediaInsert(editor: Editor | null) {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const insertImageAttrs = useCallback(
    (attrs: {
      src: string
      storageKey?: string | null
      width?: number
      height?: number | null
      alt?: string | null
      dataQr?: string | null
    }) => {
      if (!editor) {
        return
      }

      editor.chain().focus().insertDocumentImage(attrs).run()
    },
    [editor],
  )

  const insertImageFiles = useCallback(
    async (files: File[]) => {
      if (!editor) {
        return
      }

      const imageFiles = files.filter(isSupportedDocumentImage)

      if (imageFiles.length === 0) {
        message.warning(t('documents.image.unsupported'))
        return
      }

      for (const file of imageFiles) {
        try {
          const uploaded = await uploadDocumentImage(file)
          insertImageAttrs({
            src: uploaded.src,
            storageKey: uploaded.storageKey,
            width: uploaded.width,
            height: uploaded.height,
            alt: file.name,
          })
        } catch {
          message.error(t('documents.image.uploadError'))
        }
      }
    },
    [editor, insertImageAttrs, message, t],
  )

  const openImagePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImageInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : []
      event.target.value = ''
      void insertImageFiles(files)
    },
    [insertImageFiles],
  )

  const handleEditorDrop = useCallback(
    (event: DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files?.length) {
        return false
      }

      const imageFiles = Array.from(files).filter(isSupportedDocumentImage)
      if (imageFiles.length === 0) {
        return false
      }

      event.preventDefault()
      void insertImageFiles(imageFiles)
      return true
    },
    [insertImageFiles],
  )

  const handleEditorPaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) {
        return false
      }

      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            imageFiles.push(file)
          }
        }
      }

      if (imageFiles.length === 0) {
        return false
      }

      event.preventDefault()
      void insertImageFiles(imageFiles)
      return true
    },
    [insertImageFiles],
  )

  return {
    fileInputRef,
    openImagePicker,
    handleImageInputChange,
    insertImageAttrs,
    handleEditorDrop,
    handleEditorPaste,
  }
}
