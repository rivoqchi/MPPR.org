import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react'
import '@docx-editor.dev/core/styles/editor.css'
import { Input, Spin, theme } from 'antd'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
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

  // DocxEditor expects a stable ArrayBuffer/Uint8Array or 'blank'.
  const editorDocument = useMemo(() => {
    if (documentBytes === undefined) {
      return undefined
    }

    if (documentBytes === 'blank') {
      return 'blank' as const
    }

    return new Uint8Array(documentBytes)
  }, [documentBytes])

  const showEditor = editorDocument !== undefined && !isLoading

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
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
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 240 }}>
            <Spin tip={t('documents.loadingEditor')} />
          </div>
        ) : null}

        {showEditor ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <DocxEditor
              ref={editorRef}
              document={editorDocument}
              mode={mode}
              onSave={onSave ? handleEditorSave : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
})
