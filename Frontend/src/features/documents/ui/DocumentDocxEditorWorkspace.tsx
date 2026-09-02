import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react'
import '@docx-editor.dev/core/styles/editor.css'
import { Input, Spin, theme } from 'antd'
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export type DocumentDocxEditorHandle = {
  save: () => Promise<Uint8Array | null>
}

interface DocumentDocxEditorWorkspaceProps {
  documentBytes: Uint8Array | 'blank' | undefined
  title: string
  onTitleChange?: (title: string) => void
  isLoading?: boolean
  mode?: 'edit' | 'view'
  onSave?: () => void | Promise<void>
}

export const DocumentDocxEditorWorkspace = forwardRef<
  DocumentDocxEditorHandle,
  DocumentDocxEditorWorkspaceProps
>(function DocumentDocxEditorWorkspace(
  {
    documentBytes,
    title,
    onTitleChange,
    isLoading = false,
    mode = 'edit',
    onSave,
  },
  ref,
) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const editorRef = useRef<DocxEditorRef>(null)

  const saveDocument = useCallback(async () => {
    const buffer = await editorRef.current?.save()
    if (!buffer) {
      return null
    }

    return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      save: saveDocument,
    }),
    [saveDocument],
  )

  const handleEditorSave = useCallback(() => {
    void onSave?.()
  }, [onSave])

  const showEditor = documentBytes !== undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: token.colorBgContainer,
      }}
    >
      {onTitleChange ? (
        <div
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('documents.titlePlaceholder')}
            variant="borderless"
            style={{ fontWeight: 600, fontSize: 16, padding: 0 }}
          />
        </div>
      ) : null}

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
            <Spin tip={t('documents.loadingEditor')} />
          </div>
        ) : null}

        {showEditor ? (
          <div style={{ width: '100%', height: '100%' }}>
            <DocxEditor
              ref={editorRef}
              document={documentBytes}
              mode={mode}
              onSave={onSave ? handleEditorSave : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
})
