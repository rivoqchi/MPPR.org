import { Skeleton, Space, theme } from 'antd'

const ROW_COUNT = 8

export function RolesPageSkeleton() {
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
        }}
      >
        <Skeleton.Input active size="large" style={{ width: 280 }} />
        <Skeleton.Button active size="large" style={{ width: 120 }} />
      </div>

      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <div key={index} style={{ padding: 16, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Space style={{ width: '100%' }} size="large">
              <Skeleton.Input active size="large" style={{ width: 48 }} />
              <Skeleton.Input active size="large" style={{ flex: 1 }} />
              <Skeleton.Input active size="large" style={{ width: 180 }} />
              <Skeleton.Input active size="large" style={{ width: 80 }} />
            </Space>
          </div>
        ))}
      </div>
    </>
  )
}
