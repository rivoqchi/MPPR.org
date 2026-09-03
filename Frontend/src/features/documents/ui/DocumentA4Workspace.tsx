import type { Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { theme } from 'antd'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  A4_HEIGHT_PX,
  A4_MARGIN_PX,
  A4_PAGE_GAP_PX,
  A4_RULER_SIZE_PX,
  A4_WIDTH_PX,
  getPageCountForContentHeight,
  getPageTopOffset,
  getStackHeightForPages,
} from '@/features/documents/lib/a4-layout'
import { DocumentA4Page, DocumentA4PageGap } from '@/features/documents/ui/DocumentA4Page'
import { DocumentA4Ruler } from '@/features/documents/ui/DocumentA4Ruler'

interface DocumentA4WorkspaceProps {
  editor: Editor | null
  toolbar?: ReactNode
}

export function DocumentA4Workspace({ editor, toolbar }: DocumentA4WorkspaceProps) {
  const { token } = theme.useToken()
  const proseMirrorRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT_PX - A4_MARGIN_PX * 2)

  useEffect(() => {
    const root = proseMirrorRef.current
    if (!root || !editor) {
      return
    }

    const proseMirror = root.querySelector('.ProseMirror')
    if (!(proseMirror instanceof HTMLElement)) {
      return
    }

    const measure = () => {
      setContentHeight(proseMirror.scrollHeight)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(proseMirror)

    editor.on('update', measure)
    editor.on('transaction', measure)

    return () => {
      observer.disconnect()
      editor.off('update', measure)
      editor.off('transaction', measure)
    }
  }, [editor])

  const usedPages = getPageCountForContentHeight(contentHeight)
  const pageCount = usedPages + 1
  const stackHeight = getStackHeightForPages(pageCount)

  return (
    <div className="document-a4-shell">
      {toolbar}

      <div className="document-a4-scroll" style={{ background: token.colorFillAlter }}>
        <div className="document-a4-scroll-inner">
          <div
            className="document-a4-grid"
            style={{
              gridTemplateColumns: `${A4_RULER_SIZE_PX}px ${A4_WIDTH_PX}px`,
              gridTemplateRows: `${A4_RULER_SIZE_PX}px auto`,
            }}
          >
            <div className="document-a4-ruler-corner" aria-hidden />

            <div className="document-a4-ruler-h-wrap">
              <DocumentA4Ruler orientation="horizontal" />
            </div>

            <div className="document-a4-ruler-v-column">
              {Array.from({ length: pageCount }, (_, pageIndex) => (
                <div key={pageIndex} className="document-a4-ruler-v-segment">
                  <DocumentA4Ruler orientation="vertical" pageIndex={pageIndex} />
                  {pageIndex < pageCount - 1 ? (
                    <div
                      className="document-a4-ruler-v-gap"
                      style={{ height: A4_PAGE_GAP_PX }}
                      aria-hidden
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div
              className="document-a4-canvas-wrap"
              style={{
                width: A4_WIDTH_PX,
                minHeight: stackHeight,
              }}
            >
              <div
                className="document-a4-stack"
                style={{
                  width: A4_WIDTH_PX,
                  minHeight: stackHeight,
                }}
              >
                <div className="document-a4-pages" style={{ height: stackHeight }}>
                  {Array.from({ length: pageCount }, (_, pageIndex) => (
                    <div key={pageIndex}>
                      <DocumentA4Page pageIndex={pageIndex} pageNumber={pageIndex + 1} />
                      {pageIndex < pageCount - 1 ? (
                        <DocumentA4PageGap pageIndex={pageIndex} />
                      ) : null}
                    </div>
                  ))}
                </div>

                <div
                  ref={proseMirrorRef}
                  className="document-a4-editor-layer"
                  style={{
                    minHeight: stackHeight,
                  }}
                >
                  <EditorContent editor={editor} />
                </div>

                <div className="document-a4-gap-overlays" style={{ height: stackHeight }}>
                  {Array.from({ length: pageCount - 1 }, (_, pageIndex) => (
                    <div
                      key={pageIndex}
                      className="document-a4-gap-overlay"
                      style={{
                        top: getPageTopOffset(pageIndex) + A4_HEIGHT_PX,
                        width: A4_WIDTH_PX,
                        height: A4_PAGE_GAP_PX,
                      }}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
