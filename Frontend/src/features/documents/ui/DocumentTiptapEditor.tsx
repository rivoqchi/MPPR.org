import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Input, Space, Spin, theme } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDocumentMediaInsert } from '@/features/documents/lib/use-document-media-insert'
import { PageBreak } from '@/features/documents/lib/tiptap-page-break-extension'
import { ResizableDocumentImage } from '@/features/documents/lib/tiptap-resizable-image-extension'
import { DocumentA4Workspace } from '@/features/documents/ui/DocumentA4Workspace'
import { DocumentQrCodeModal } from '@/features/documents/ui/DocumentQrCodeModal'
import { DocumentTiptapToolbar } from '@/features/documents/ui/DocumentTiptapToolbar'
import { getSplitPanelSurfaceStyle } from '@/shared/lib/page-layout'

interface DocumentTiptapEditorProps {
  title: string
  onTitleChange: (value: string) => void
  onSave: (html: string) => void
  isSaving?: boolean
  showBackButton?: boolean
  backPath?: string
  initialHtml?: string
  isLoading?: boolean
}

export function DocumentTiptapEditor({
  title,
  onTitleChange,
  onSave,
  isSaving = false,
  showBackButton = true,
  backPath = '/files',
  initialHtml,
  isLoading = false,
}: DocumentTiptapEditorProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const placeholder = t('documents.tiptapPlaceholder')

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      PageBreak,
      ResizableDocumentImage,
    ],
    [placeholder],
  )

  const editor = useEditor({
    extensions,
    content: initialHtml ?? '<p></p>',
    editorProps: {
      attributes: {
        class: 'document-tiptap-editor',
      },
    },
  })

  const {
    fileInputRef,
    openImagePicker,
    handleImageInputChange,
    insertImageAttrs,
    handleEditorDrop,
    handleEditorPaste,
  } = useDocumentMediaInsert(editor)

  useEffect(() => {
    if (!editor || editor.isDestroyed || !initialHtml) {
      return
    }

    editor.commands.setContent(initialHtml, { emitUpdate: false })
  }, [editor, initialHtml])

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return
    }

    const prevDrop = editor.options.editorProps.handleDrop
    const prevPaste = editor.options.editorProps.handlePaste

    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handleDrop: (view, event, slice, moved) => {
          if (handleEditorDrop(event)) {
            return true
          }

          return prevDrop?.(view, event, slice, moved) ?? false
        },
        handlePaste: (view, event, slice) => {
          if (handleEditorPaste(event)) {
            return true
          }

          return prevPaste?.(view, event, slice) ?? false
        },
      },
    })
  }, [editor, handleEditorDrop, handleEditorPaste])

  useEffect(() => {
    if (!editor || editor.isDestroyed || isLoading) {
      return
    }

    const frame = requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        editor.commands.focus('end')
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [editor, isLoading])

  if (isLoading) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          placeItems: 'center',
          ...getSplitPanelSurfaceStyle(token),
        }}
      >
        <Spin size="large" tip={t('documents.previewLoading')} />
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        ...getSplitPanelSurfaceStyle(token),
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleImageInputChange}
      />

      <DocumentQrCodeModal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onInsert={insertImageAttrs}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <Space wrap style={{ flex: 1, minWidth: 0 }}>
          {showBackButton ? (
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}>
              {t('files.backToList')}
            </Button>
          ) : null}
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('documents.tiptapTitlePlaceholder')}
            style={{ minWidth: 240, maxWidth: 420 }}
          />
        </Space>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={isSaving}
          disabled={!editor}
          onClick={() => onSave(editor?.getHTML() ?? '')}
        >
          {t('documents.tiptapSave')}
        </Button>
      </div>

      <DocumentA4Workspace
        editor={editor}
        toolbar={
          <DocumentTiptapToolbar
            editor={editor}
            onInsertImage={openImagePicker}
            onInsertQr={() => setIsQrModalOpen(true)}
          />
        }
      />
    </div>
  )
}
