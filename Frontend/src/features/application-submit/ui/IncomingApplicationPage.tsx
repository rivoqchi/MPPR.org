import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import {
  filterApplicationsByStatusTab,
  type ApplicationListStatusTabKey,
} from '@/features/application-submit/lib/application-list-status-tabs'
import { filterIncomingApplications } from '@/features/application-submit/lib/incoming-applications'
import { ApplicationChatList } from '@/features/application-submit/ui/ApplicationChatList'
import { ApplicationDetail } from '@/features/application-submit/ui/ApplicationDetail'
import { ApplicationListStatusTabs } from '@/features/application-submit/ui/ApplicationListStatusTabs'
import { useApplicationsHydration } from '@/shared/hooks/useApplicationsHydration'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle, splitPageRowStyle } from '@/shared/lib/page-layout'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { SubmitApplicationPageSkeleton } from '@/features/application-submit/ui/SubmitApplicationPageSkeleton'

const PAGE_KEY = '/applications/incoming'

export function IncomingApplicationPage() {
  const [searchParams] = useSearchParams()
  const applicationIdFromUrl = searchParams.get('applicationId')
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const isApplicationsHydrated = useApplicationsHydration()
  const applications = useApplicationsStore((state) => state.applications)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>()
  const [statusTab, setStatusTab] = useState<ApplicationListStatusTabKey>('all')

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

  const filteredApplications = useMemo(
    () => filterApplicationsByStatusTab(incomingApplications, statusTab),
    [incomingApplications, statusTab],
  )

  const activeApplicationId = useMemo(() => {
    if (
      selectedApplicationId &&
      filteredApplications.some((application) => application.id === selectedApplicationId)
    ) {
      return selectedApplicationId
    }

    return filteredApplications[0]?.id
  }, [filteredApplications, selectedApplicationId])

  const selectedApplication = useMemo(
    () => filteredApplications.find((application) => application.id === activeApplicationId),
    [activeApplicationId, filteredApplications],
  )

  useEffect(() => {
    if (!applicationIdFromUrl) {
      return
    }

    const exists = incomingApplications.some(
      (application) => application.id === applicationIdFromUrl,
    )

    if (exists) {
      setStatusTab('all')
      setSelectedApplicationId(applicationIdFromUrl)
    }
  }, [applicationIdFromUrl, incomingApplications])

  if (!isApplicationsHydrated) {
    return <SubmitApplicationPageSkeleton />
  }

  return (
    <RequirePageView pageKey={PAGE_KEY}>
      <div style={fullHeightPageStyle}>
        <ApplicationListStatusTabs
          applications={incomingApplications}
          activeKey={statusTab}
          onChange={setStatusTab}
        />

        <div style={splitPageRowStyle}>
          <ApplicationChatList
            applications={filteredApplications}
            selectedApplicationId={activeApplicationId}
            onSelect={setSelectedApplicationId}
            listTitleKey="applicationIncoming.listTitle"
            emptyListKey={
              incomingApplications.length === 0
                ? 'applicationIncoming.emptyList'
                : 'applicationIncoming.emptyStatusFilter'
            }
            emptySearchKey="applicationIncoming.emptySearch"
          />

          <ApplicationDetail
            application={selectedApplication}
            detailTitleKey="applicationIncoming.detailTitle"
            selectItemKey="applicationIncoming.selectItem"
            mode="incoming"
            viewerStructuralUnitId={currentUser?.structuralUnitId}
            canViewAll={canViewAll}
            showWorkflowPanel
          />
        </div>
      </div>
    </RequirePageView>
  )
}
