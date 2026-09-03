/** A4 at 96 DPI — matches Word / browser print defaults */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123

/** Default Word margins: 2.54 cm (1 inch) */
export const A4_MARGIN_PX = 96

/** Gray gap between stacked pages */
export const A4_PAGE_GAP_PX = 24
export const A4_RULER_SIZE_PX = 22

export const A4_CONTENT_WIDTH_PX = A4_WIDTH_PX - A4_MARGIN_PX * 2
export const A4_CONTENT_HEIGHT_PX = A4_HEIGHT_PX - A4_MARGIN_PX * 2

/** 1 cm in CSS pixels at 96 DPI */
export const CM_IN_PX = 37.7952755906

/** 1 mm in CSS pixels at 96 DPI */
export const MM_IN_PX = CM_IN_PX / 10

export function getPageCountForContentHeight(contentHeight: number): number {
  if (contentHeight <= 0) {
    return 1
  }

  return Math.max(1, Math.ceil(contentHeight / A4_CONTENT_HEIGHT_PX))
}

export function getStackHeightForPages(pageCount: number): number {
  if (pageCount <= 1) {
    return A4_HEIGHT_PX
  }

  return pageCount * A4_HEIGHT_PX + (pageCount - 1) * A4_PAGE_GAP_PX
}

export function getPageTopOffset(pageIndex: number): number {
  return pageIndex * (A4_HEIGHT_PX + A4_PAGE_GAP_PX)
}
