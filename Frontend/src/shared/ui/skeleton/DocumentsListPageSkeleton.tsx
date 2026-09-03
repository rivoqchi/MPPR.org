import { Skeleton, theme } from 'antd'
import {
  getSplitPanelSurfaceStyle,
  pageToolbarStyle,
  scrollablePageStyle,
} from '@/shared/lib/page-layout'

const COLUMN_WIDTHS = ['64px', '1fr', '120px', '180px', '72px'] as const
const ROW_COUNT = 8

function TableHeaderSkeleton() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMN_WIDTHS.join(' '),
        gap: 16,
        padding: '12px 16px',
        background: token.colorFillAlter,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {COLUMN_WIDTHS.map((_, index) => (
        <Skeleton.Input key={index} active size="small" style={{ width: '100%', minWidth: 40 }} />
      ))}
    </div>
  )
}

function TableRowSkeleton() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMN_WIDTHS.join(' '),
        gap: 16,
        alignItems: 'center',
        padding: '16px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Skeleton.Input active size="small" style={{ width: 28, minWidth: 28 }} />
      <Skeleton.Input active size="small" style={{ width: '100%', minWidth: 120 }} />
      <Skeleton.Input active size="small" style={{ width: 72, minWidth: 72 }} />
      <Skeleton.Input active size="small" style={{ width: 140, minWidth: 140 }} />
      <Skeleton.Button active size="small" style={{ width: 32, minWidth: 32 }} />
    </div>
  )
}

export function DocumentsListPageSkeleton() {
  const { token } = theme.useToken()

  return (
    <div style={scrollablePageStyle}>
      <div style={pageToolbarStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <Skeleton.Input active size="large" style={{ width: 200, minWidth: 160 }} />
          <Skeleton.Input active size="small" style={{ width: 280, minWidth: 200 }} />
        </div>
        <Skeleton.Button active size="large" style={{ width: 120 }} />
      </div>

      <div style={getSplitPanelSurfaceStyle(token)}>
        <TableHeaderSkeleton />
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <TableRowSkeleton key={index} />
        ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 16,
          }}
        >
          <Skeleton.Input active size="small" style={{ width: 200, minWidth: 160 }} />
        </div>
      </div>
    </div>
  )
}
