import { Skeleton, Space } from 'antd'

interface TableSkeletonProps {
  rows?: number
}

export function TableSkeleton({ rows = 6 }: TableSkeletonProps) {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Skeleton.Input active style={{ width: '100%', maxWidth: 320 }} />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} active title={false} paragraph={{ rows: 1 }} />
      ))}
    </Space>
  )
}
