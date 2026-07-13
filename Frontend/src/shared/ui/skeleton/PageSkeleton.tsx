import { Skeleton, Space } from 'antd'

export function PageSkeleton() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Skeleton.Input active size="large" style={{ width: 280 }} />
      <Skeleton active paragraph={{ rows: 3 }} />
      <Skeleton active paragraph={{ rows: 5 }} />
    </Space>
  )
}
