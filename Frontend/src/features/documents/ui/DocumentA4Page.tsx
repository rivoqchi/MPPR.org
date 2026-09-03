import {
  A4_HEIGHT_PX,
  A4_PAGE_GAP_PX,
  A4_WIDTH_PX,
  getPageTopOffset,
} from '@/features/documents/lib/a4-layout'

interface DocumentA4PageProps {
  pageIndex: number
  pageNumber: number
}

export function DocumentA4Page({ pageIndex, pageNumber }: DocumentA4PageProps) {
  return (
    <div
      className="document-a4-page"
      style={{
        top: getPageTopOffset(pageIndex),
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
      }}
    >
      <span className="document-a4-page__number">{pageNumber}</span>
    </div>
  )
}

export function DocumentA4PageGap({ pageIndex }: { pageIndex: number }) {
  return (
    <div
      className="document-a4-page-gap"
      style={{
        top: getPageTopOffset(pageIndex) + A4_HEIGHT_PX,
        width: A4_WIDTH_PX,
        height: A4_PAGE_GAP_PX,
      }}
    />
  )
}
