import { Card, Skeleton } from 'antd'

interface CardSkeletonProps {
  rows?: number
}

export function CardSkeleton({ rows = 3 }: CardSkeletonProps) {
  return (
    <Card>
      <Skeleton active title paragraph={{ rows }} />
    </Card>
  )
}
