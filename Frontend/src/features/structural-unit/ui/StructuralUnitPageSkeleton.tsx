import { Skeleton, Space, theme } from 'antd'

const COLUMN_WIDTHS = ['64px', '1.5fr', '140px', '1.2fr', '120px', '120px'] as const
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
        <Skeleton.Input key={index} active size="large" style={{ width: '100%', minWidth: 48 }} />
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
        padding: '16px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {COLUMN_WIDTHS.map((_, index) => (
        <Skeleton.Input key={index} active size="large" style={{ width: index === 2 ? 72 : '100%' }} />
      ))}
    </div>
  )
}

export function StructuralUnitPageSkeleton() {
  const { token } = theme.useToken()

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          <Skeleton.Input active size="large" style={{ width: 280 }} />
          <Skeleton.Input active size="large" style={{ width: 200 }} />
          <Skeleton.Input active size="large" style={{ width: 280 }} />
        </Space>
        <Skeleton.Button active size="large" style={{ width: 120 }} />
      </div>

      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
        }}
      >
        <TableHeaderSkeleton />
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <TableRowSkeleton key={index} />
        ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Skeleton.Input active size="large" style={{ width: 320 }} />
        </div>
      </div>
    </>
  )
}
