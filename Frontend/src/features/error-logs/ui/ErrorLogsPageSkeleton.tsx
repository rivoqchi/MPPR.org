import { Skeleton, Space } from 'antd'

export function ErrorLogsPageSkeleton() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Skeleton.Input active style={{ width: 280, height: 32 }} />
      <Skeleton active paragraph={{ rows: 10 }} />
    </Space>
  )
}
