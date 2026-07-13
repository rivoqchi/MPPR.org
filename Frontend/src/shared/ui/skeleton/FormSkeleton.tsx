import { Skeleton, Space } from 'antd'

interface FormSkeletonProps {
  fields?: number
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 480 }}>
      {Array.from({ length: fields }, (_, index) => (
        <Skeleton key={index} active title={{ width: '30%' }} paragraph={false} />
      ))}
      <Skeleton.Button active size="large" style={{ width: 120 }} />
    </Space>
  )
}
