import { PDFDocument } from 'pdf-lib'

export type PdfQrStampPlacement = {
  pageIndex: number
  /** 0..1 from left */
  xRatio: number
  /** 0..1 from top */
  yRatio: number
  /** QR size as fraction of page width */
  sizeRatio: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(1, Math.max(0, value))
}

/** Stamp QR onto the exact PDF bytes shown in the placement UI (WYSIWYG). */
export async function stampQrOntoPdfBytes(
  pdfBytes: ArrayBuffer,
  pngBytes: ArrayBuffer | Uint8Array,
  placement: PdfQrStampPlacement,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  if (pages.length === 0) {
    throw new Error('EMPTY_PDF')
  }

  const pageIndex = Math.min(Math.max(0, placement.pageIndex), pages.length - 1)
  const page = pages[pageIndex]
  const { width, height } = page.getSize()
  const qrImage = await pdfDoc.embedPng(pngBytes)

  const xRatio = clamp01(placement.xRatio)
  const yRatio = clamp01(placement.yRatio)
  const sizeRatio = Math.min(0.5, Math.max(0.04, placement.sizeRatio || 0.12))

  const sizePt = width * sizeRatio
  const x = xRatio * width
  const y = height - yRatio * height - sizePt

  page.drawImage(qrImage, {
    x: Math.max(0, Math.min(x, width - sizePt)),
    y: Math.max(0, Math.min(y, height - sizePt)),
    width: sizePt,
    height: sizePt,
  })

  return pdfDoc.save()
}
