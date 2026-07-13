import { Skeleton, Space } from 'antd'

interface UserListSkeletonProps {
  count?: number
}

export function UserListSkeleton({ count = 8 }: UserListSkeletonProps) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%', padding: 12 }}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton.Avatar active size="large" />
          <Skeleton active title paragraph={{ rows: 1 }} style={{ flex: 1 }} />
        </div>
      ))}
    </Space>
  )
}
