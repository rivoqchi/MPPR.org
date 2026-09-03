import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { useCallback, useRef } from 'react'

type ResizeCorner = 'se' | 'sw' | 'ne' | 'nw'

export function ResizableImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const startRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)

  const width = Number(node.attrs.width) || 280
  const height = Number(node.attrs.height) || undefined

  const startResize = useCallback(
    (event: React.MouseEvent, corner: ResizeCorner) => {
      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startY = event.clientY
      const startWidth = width
      const aspectRatio = height && width ? height / width : 1

      startRef.current = { x: startX, y: startY, width: startWidth, height: height ?? startWidth * aspectRatio }

      const onMove = (moveEvent: MouseEvent) => {
        const start = startRef.current
        if (!start) {
          return
        }

        const deltaX =
          corner.includes('e') ? moveEvent.clientX - start.x : start.x - moveEvent.clientX

        const nextWidth = Math.max(80, Math.min(602, start.width + deltaX))
        const nextHeight = Math.round(nextWidth * (start.height / start.width))

        updateAttributes({
          width: Math.round(nextWidth),
          height: nextHeight,
        })
      }

      const onUp = () => {
        startRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [height, updateAttributes, width],
  )

  return (
    <NodeViewWrapper className="document-resizable-image-wrap" data-drag-handle="">
      <div
        className={`document-resizable-image${selected ? ' document-resizable-image--selected' : ''}`}
        style={{ width, maxWidth: '100%' }}
        contentEditable={false}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt ?? ''}
          draggable={false}
          style={{
            width: '100%',
            height: height ? `${height}px` : 'auto',
            display: 'block',
            objectFit: 'contain',
          }}
        />

        {node.attrs.dataQr ? <span className="document-resizable-image__badge">QR</span> : null}

        {selected ? (
          <>
            {(['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).map((corner) => (
              <span
                key={corner}
                className={`document-resizable-image__handle document-resizable-image__handle--${corner}`}
                onMouseDown={(event) => startResize(event, corner)}
              />
            ))}
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}
