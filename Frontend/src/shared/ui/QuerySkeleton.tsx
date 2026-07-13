import type { ReactNode } from 'react'

interface QuerySkeletonProps {
  isLoading: boolean
  skeleton: ReactNode
  children: ReactNode
}

export function QuerySkeleton({ isLoading, skeleton, children }: QuerySkeletonProps) {
  if (isLoading) {
    return skeleton
  }

  return children
}
