import { useCallback } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { ApplicationWorkflowWorkspace } from '@/features/application-workflow/ui/ApplicationWorkflowWorkspace'

export function ApplicationWorkflowPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const fromIncoming = location.pathname.includes('/applications/incoming/')
  const returnApplicationId = searchParams.get('returnApplicationId') ?? applicationId
  const navigate = useNavigate()
  const backPath = fromIncoming ? '/applications/incoming' : '/applications/submit'

  const handleBack = useCallback(() => {
    const search = returnApplicationId ? `?applicationId=${returnApplicationId}` : ''
    navigate(`${backPath}${search}`)
  }, [backPath, navigate, returnApplicationId])
  return <ApplicationWorkflowWorkspace applicationId={applicationId} onBack={handleBack} />
}
