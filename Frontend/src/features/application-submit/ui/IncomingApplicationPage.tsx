import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutlet, useSearchParams } from 'react-router-dom'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { filterIncomingApplications } from '@/features/application-submit/lib/incoming-applications'
import { canAccessApplicationWorkflow } from '@/features/application-workflow/lib/workflow-access'
import { ApplicationChatList } from '@/features/application-submit/ui/ApplicationChatList'
import { ApplicationDetail } from '@/features/application-submit/ui/ApplicationDetail'
import { useApplicationsHydration } from '@/shared/hooks/useApplicationsHydration'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle, splitPageRowStyle } from '@/shared/lib/page-layout'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { SubmitApplicationPageSkeleton } from '@/features/application-submit/ui/SubmitApplicationPageSkeleton'

const PAGE_KEY = '/applications/incoming'

export function IncomingApplicationPage() {
  const navigate = useNavigate()
  const workflowOutlet = useOutlet()
  const [searchParams] = useSearchParams()
  const applicationIdFromUrl = searchParams.get('applicationId')
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const { canEdit } = useRolePermissions()
  const isApplicationsHydrated = useApplicationsHydration()
  const applications = useApplicationsStore((state) => state.applications)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>()

  const incomingApplications = useMemo(
    () =>
      filterIncomingApplications(applications, {
        structuralUnitId: currentUser?.structuralUnitId,
        userId: currentUser?.id,
        canViewAll,
        structuralUnits,
        users,
      }),
    [
      applications,
      canViewAll,
      currentUser?.id,
      currentUser?.structuralUnitId,
      structuralUnits,
      users,
    ],
  )

  const activeApplicationId = selectedApplicationId ?? incomingApplications[0]?.id

  const selectedApplication = useMemo(
    () => incomingApplications.find((application) => application.id === activeApplicationId),
    [activeApplicationId, incomingApplications],
  )

  useEffect(() => {
    if (!applicationIdFromUrl) {
      return
    }

    const exists = incomingApplications.some(
      (application) => application.id === applicationIdFromUrl,
    )

    if (exists) {
      setSelectedApplicationId(applicationIdFromUrl)
    }
  }, [applicationIdFromUrl, incomingApplications])

  if (!isApplicationsHydrated) {
    return <SubmitApplicationPageSkeleton />
  }

  if (workflowOutlet) {
    return <RequirePageView pageKey={PAGE_KEY}>{workflowOutlet}</RequirePageView>
  }

  return (
    <RequirePageView pageKey={PAGE_KEY}>
      <div style={fullHeightPageStyle}>
        <div style={splitPageRowStyle}>
          <ApplicationChatList
            applications={incomingApplications}
            selectedApplicationId={activeApplicationId}
            onSelect={setSelectedApplicationId}
            listTitleKey="applicationIncoming.listTitle"
            emptyListKey="applicationIncoming.emptyList"
            emptySearchKey="applicationIncoming.emptySearch"
          />

          <ApplicationDetail
            application={selectedApplication}
            detailTitleKey="applicationIncoming.detailTitle"
            selectItemKey="applicationIncoming.selectItem"
            mode="incoming"
            viewerStructuralUnitId={currentUser?.structuralUnitId}
            canViewAll={canViewAll}
            onOpenWorkflow={
              selectedApplication &&
              canEdit(PAGE_KEY) &&
              canAccessApplicationWorkflow(
                selectedApplication,
                currentUser?.structuralUnitId,
                canViewAll,
                {
                  userId: currentUser?.id,
                  structuralUnits,
                  users,
                },
              )
                ? () =>
                    navigate(
                      `workflow/${selectedApplication.id}?returnApplicationId=${selectedApplication.id}`,
                    )
                : undefined
            }
          />
        </div>
      </div>
    </RequirePageView>
  )
}
