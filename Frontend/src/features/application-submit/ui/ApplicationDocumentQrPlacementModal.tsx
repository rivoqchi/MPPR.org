import { CloseOutlined, QrcodeOutlined, SaveOutlined } from '@ant-design/icons'
import { App, Button, Slider, Space, Spin, Typography, theme } from 'antd'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import QRCode from 'qrcode'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { A4_WIDTH_PX, MM_IN_PX } from '@/features/documents/lib/a4-layout'
import { stampQrOntoPdfBytes } from '@/features/application-submit/lib/stamp-qr-onto-pdf'
import {
  fetchDocumentPdfPreviewBlob,
  type DocumentAttachmentCopy,
  type UserDocumentSummary,
} from '@/shared/api/documents-api'
import { uploadFile } from '@/shared/api/files-api'

GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const DEFAULT_QR_SIZE_MM = 32
const MIN_QR_SIZE_MM = 18
const MAX_QR_SIZE_MM = 70
const PAGE_GAP_PX = 24
const RENDER_WIDTH_PX = A4_WIDTH_PX

type QrOverlayState = {
  pageIndex: number
  offsetXPx: number
  offsetYPx: number
  sizeMm: number
  dataUrl: string
  pngBytes: Uint8Array
}

interface ApplicationDocumentQrPlacementModalProps {
  open: boolean
  document: UserDocumentSummary | null
  qrText: string
  onlyOfficeLang?: string
  onClose: () => void
  onReady: (attachment: DocumentAttachmentCopy) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

async function waitForElement(
  getElement: () => HTMLDivElement | null,
  attempts = 40,
): Promise<HTMLDivElement | null> {
  for (let index = 0; index < attempts; index += 1) {
    const element = getElement()
    if (element) {
      return element
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }

  return getElement()
}

async function renderPdfPages(
  pdf: PDFDocumentProxy,
  container: HTMLDivElement,
): Promise<HTMLElement[]> {
  container.innerHTML = ''
  const pages: HTMLElement[] = []
  const pageCount = pdf.numPages

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const unscaled = page.getViewport({ scale: 1 })
    const cssScale = RENDER_WIDTH_PX / unscaled.width
    const outputScale = window.devicePixelRatio || 1
    const viewport = page.getViewport({ scale: cssScale * outputScale })

    const pageShell = window.document.createElement('div')
    pageShell.className = 'qr-pdf-page'
    pageShell.style.position = 'relative'
    pageShell.style.width = `${RENDER_WIDTH_PX}px`
    pageShell.style.height = `${unscaled.height * cssScale}px`
    pageShell.style.margin = `0 auto ${PAGE_GAP_PX}px`
    pageShell.style.background = '#fff'
    pageShell.style.boxShadow = '0 2px 6px rgb(0 0 0 / 10%), 0 8px 24px rgb(0 0 0 / 8%)'
    pageShell.style.border = '1px solid #b8b8b8'
    pageShell.style.overflow = 'hidden'

    const canvas = window.document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${RENDER_WIDTH_PX}px`
    canvas.style.height = `${unscaled.height * cssScale}px`
    canvas.style.display = 'block'

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('CANVAS_CONTEXT')
    }

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise

    pageShell.appendChild(canvas)
    container.appendChild(pageShell)
    pages.push(pageShell)
  }

  return pages
}

export function ApplicationDocumentQrPlacementModal({
  open,
  document,
  qrText,
  onClose,
  onReady,
}: ApplicationDocumentQrPlacementModalProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const previewRef = useRef<HTMLDivElement>(null)
  const pdfBytesRef = useRef<ArrayBuffer | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [pageElements, setPageElements] = useState<HTMLElement[]>([])
  const [qrOverlay, setQrOverlay] = useState<QrOverlayState | null>(null)
  const [isCreatingQr, setIsCreatingQr] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dragPointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open || !document) {
      setQrOverlay(null)
      setPreviewError(null)
      setPageElements([])
      setIsLoadingPreview(false)
      pdfBytesRef.current = null
      return
    }

    let cancelled = false
    let loadingTask: ReturnType<typeof getDocument> | null = null

    async function loadPreview() {
      setIsLoadingPreview(true)
      setPreviewError(null)
      setPageElements([])
      setQrOverlay(null)
      pdfBytesRef.current = null

      const container = await waitForElement(() => previewRef.current)
      if (cancelled || !container || !document) {
        if (!cancelled) {
          setIsLoadingPreview(false)
          setPreviewError(t('documents.previewError'))
        }
        return
      }

      container.innerHTML = ''

      try {
        const blob = await fetchDocumentPdfPreviewBlob(document.id)
        if (cancelled || !previewRef.current) {
          return
        }

        const pdfBytes = await blob.arrayBuffer()
        // Keep an immutable copy — pdf.js may detach the original buffer.
        pdfBytesRef.current = pdfBytes.slice(0)

        loadingTask = getDocument({ data: new Uint8Array(pdfBytes) })
        const pdfDoc: PDFDocumentProxy = await loadingTask.promise
        if (cancelled || !previewRef.current) {
          await loadingTask.destroy()
          return
        }

        const pages = await renderPdfPages(pdfDoc, previewRef.current)
        if (!cancelled) {
          setPageElements(pages)
          setPreviewError(null)
        }
      } catch {
        if (!cancelled) {
          setPageElements([])
          setPreviewError(t('documents.previewError'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      void loadingTask?.destroy()
    }
  }, [document, open, t])

  const resolvePageFromPoint = useCallback(
    (
      clientX: number,
      clientY: number,
      sizePx: number,
    ): { pageIndex: number; offsetXPx: number; offsetYPx: number } | null => {
      if (pageElements.length === 0) {
        return null
      }

      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY
      let bestRect: DOMRect | null = null

      pageElements.forEach((page, index) => {
        const rect = page.getBoundingClientRect()
        const inside =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom

        if (inside) {
          bestIndex = index
          bestRect = rect
          bestDistance = 0
          return
        }

        const dx =
          clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0
        const dy =
          clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0
        const distance = Math.hypot(dx, dy)

        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
          bestRect = rect
        }
      })

      if (!bestRect) {
        return null
      }

      const rect = bestRect as DOMRect
      return {
        pageIndex: bestIndex,
        offsetXPx: clamp(clientX - rect.left - sizePx / 2, 0, Math.max(0, rect.width - sizePx)),
        offsetYPx: clamp(clientY - rect.top - sizePx / 2, 0, Math.max(0, rect.height - sizePx)),
      }
    },
    [pageElements],
  )

  const handleCreateQr = useCallback(async () => {
    if (!qrText.trim()) {
      message.warning(t('applicationSubmit.attachments.qrNotReady'))
      return
    }

    if (pageElements.length === 0) {
      message.warning(t('documents.previewError'))
      return
    }

    setIsCreatingQr(true)

    try {
      const dataUrl = await QRCode.toDataURL(qrText, {
        width: 512,
        margin: 1,
        errorCorrectionLevel: 'M',
      })

      const raw = dataUrl.split(',')[1] ?? ''
      const binary = window.atob(raw)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }

      const sizePx = Math.round(DEFAULT_QR_SIZE_MM * MM_IN_PX)
      const firstPage = pageElements[0]
      const defaultOffsetX = firstPage ? Math.max(24, firstPage.clientWidth - sizePx - 48) : 48
      const defaultOffsetY = firstPage ? Math.max(24, firstPage.clientHeight - sizePx - 48) : 48

      setQrOverlay({
        pageIndex: 0,
        offsetXPx: defaultOffsetX,
        offsetYPx: defaultOffsetY,
        sizeMm: DEFAULT_QR_SIZE_MM,
        dataUrl,
        pngBytes: bytes,
      })
    } catch {
      message.error(t('applicationSubmit.attachments.qrInsertError'))
    } finally {
      setIsCreatingQr(false)
    }
  }, [message, pageElements, qrText, t])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragPointerIdRef.current = event.pointerId
  }, [])

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragPointerIdRef.current !== event.pointerId) {
        return
      }

      setQrOverlay((current) => {
        if (!current) {
          return current
        }

        const sizePx = Math.round(current.sizeMm * MM_IN_PX)
        const resolved = resolvePageFromPoint(event.clientX, event.clientY, sizePx)
        if (!resolved) {
          return current
        }

        return {
          ...current,
          pageIndex: resolved.pageIndex,
          offsetXPx: resolved.offsetXPx,
          offsetYPx: resolved.offsetYPx,
        }
      })
    },
    [resolvePageFromPoint],
  )

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) {
      return
    }

    dragPointerIdRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handleQrSizeChange = useCallback(
    (nextSizeMm: number) => {
      setQrOverlay((current) => {
        if (!current) {
          return current
        }

        const page = pageElements[current.pageIndex] ?? pageElements[0]
        const nextSizePx = Math.round(nextSizeMm * MM_IN_PX)
        const maxX = page ? Math.max(0, page.clientWidth - nextSizePx) : current.offsetXPx
        const maxY = page ? Math.max(0, page.clientHeight - nextSizePx) : current.offsetYPx

        return {
          ...current,
          sizeMm: nextSizeMm,
          offsetXPx: clamp(current.offsetXPx, 0, maxX),
          offsetYPx: clamp(current.offsetYPx, 0, maxY),
        }
      })
    },
    [pageElements],
  )

  const handleSave = useCallback(async () => {
    if (!document || !qrOverlay) {
      message.warning(t('applicationSubmit.attachments.qrPlaceRequired'))
      return
    }

    const pdfBytes = pdfBytesRef.current
    if (!pdfBytes) {
      message.error(t('documents.previewError'))
      return
    }

    const page = pageElements[qrOverlay.pageIndex] ?? pageElements[0]
    const pageWidthPx = Math.max(1, page?.clientWidth ?? RENDER_WIDTH_PX)
    const pageHeightPx = Math.max(1, page?.clientHeight ?? 1)
    const sizePx = Math.round(qrOverlay.sizeMm * MM_IN_PX)

    setIsSubmitting(true)

    try {
      const stamped = await stampQrOntoPdfBytes(pdfBytes.slice(0), qrOverlay.pngBytes, {
        pageIndex: qrOverlay.pageIndex,
        xRatio: qrOverlay.offsetXPx / pageWidthPx,
        yRatio: qrOverlay.offsetYPx / pageHeightPx,
        sizeRatio: sizePx / pageWidthPx,
      })

      const pdfName = document.title.replace(/\.[^.]+$/i, '') + '-qr.pdf'
      const file = new File([new Uint8Array(stamped)], pdfName, {
        type: 'application/pdf',
      })

      const uploaded = await uploadFile(file, pdfName)
      onReady(uploaded)
    } catch {
      message.error(t('applicationSubmit.attachments.qrInsertError'))
    } finally {
      setIsSubmitting(false)
    }
  }, [document, message, onReady, pageElements, qrOverlay, t])

  if (!open) {
    return null
  }

  const activePage = qrOverlay ? pageElements[qrOverlay.pageIndex] : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        background: token.colorBgContainer,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
          padding: '12px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgElevated,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {t('applicationSubmit.attachments.qrPlacementTitle')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {document?.title
              ? `${document.title} — ${t('applicationSubmit.attachments.qrPlacementHint')}`
              : t('applicationSubmit.attachments.qrPlacementHint')}
          </Typography.Text>
        </div>

        <Space wrap>
          {qrOverlay ? (
            <div style={{ minWidth: 220, paddingInline: 8 }}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                {t('applicationSubmit.attachments.qrSize')}: {qrOverlay.sizeMm} mm
              </Typography.Text>
              <Slider
                min={MIN_QR_SIZE_MM}
                max={MAX_QR_SIZE_MM}
                value={qrOverlay.sizeMm}
                onChange={handleQrSizeChange}
              />
            </div>
          ) : null}
          <Button
            type="primary"
            icon={<QrcodeOutlined />}
            loading={isCreatingQr}
            disabled={isLoadingPreview || pageElements.length === 0}
            onClick={() => void handleCreateQr()}
          >
            {t('applicationSubmit.attachments.createQr')}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isSubmitting}
            onClick={() => void handleSave()}
          >
            {t('applicationSubmit.attachments.save')}
          </Button>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            {t('common.close')}
          </Button>
        </Space>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: token.colorFillAlter,
          padding: '20px 24px 32px',
        }}
      >
        {isLoadingPreview ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%' }}>
            <Spin size="large">
              <div style={{ padding: 48 }}>{t('documents.previewLoading')}</div>
            </Spin>
          </div>
        ) : null}

        {previewError ? (
          <div style={{ padding: 24, color: token.colorError }}>{previewError}</div>
        ) : null}

        <div ref={previewRef} style={{ display: isLoadingPreview ? 'none' : 'block' }} />

        {qrOverlay && activePage
          ? createPortal(
              <div
                role="presentation"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  position: 'absolute',
                  left: qrOverlay.offsetXPx,
                  top: qrOverlay.offsetYPx,
                  width: Math.round(qrOverlay.sizeMm * MM_IN_PX),
                  height: Math.round(qrOverlay.sizeMm * MM_IN_PX),
                  cursor: 'grab',
                  zIndex: 20,
                  touchAction: 'none',
                  userSelect: 'none',
                  boxShadow: token.boxShadowSecondary,
                  border: `2px solid ${token.colorPrimary}`,
                  borderRadius: 4,
                  background: '#fff',
                }}
                title={t('applicationSubmit.attachments.qrDragHint')}
              >
                <img
                  src={qrOverlay.dataUrl}
                  alt="QR"
                  draggable={false}
                  style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
                />
              </div>,
              activePage,
            )
          : null}
      </div>
    </div>
  )
}
