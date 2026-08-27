import { App } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { Application } from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import {
  filterApplicationsByStatusTab,
  type ApplicationListStatusTabKey,
} from '@/features/application-submit/lib/application-list-status-tabs'
import { ApplicationChatList } from '@/features/application-submit/ui/ApplicationChatList'
import { ApplicationDetail } from '@/features/application-submit/ui/ApplicationDetail'
import { ApplicationListStatusTabs } from '@/features/application-submit/ui/ApplicationListStatusTabs'
import { ApplicationSendDrawer } from '@/features/application-submit/ui/ApplicationSendDrawer'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useApplicationsHydration } from '@/shared/hooks/useApplicationsHydration'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle, splitPageRowStyle } from '@/shared/lib/page-layout'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { SubmitApplicationPageSkeleton } from '@/features/application-submit/ui/SubmitApplicationPageSkeleton'

export function SubmitApplicationPage() {
  const pageKey = '/applications/submit'
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const isApplicationsHydrated = useApplicationsHydration()
  const applications = useApplicationsStore((state) => state.applications)
  const removeApplication = useApplicationsStore((state) => state.removeApplication)
  const [searchParams] = useSearchParams()
  const applicationIdFromUrl = searchParams.get('applicationId')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>()
  const [statusTab, setStatusTab] = useState<ApplicationListStatusTabKey>('all')

  const myApplications = useMemo(
    () =>
      canViewAll
        ? applications
        : applications.filter((application) => application.createdByUserId === currentUser?.id),
    [applications, canViewAll, currentUser?.id],
  )

  const filteredApplications = useMemo(
    () => filterApplicationsByStatusTab(myApplications, statusTab),
    [myApplications, statusTab],
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

  const isApplicationLocked = selectedApplication
    ? isApplicationFinalized(selectedApplication)
    : false

  useEffect(() => {
    if (!applicationIdFromUrl) {
      return
    }

    const exists = myApplications.some((application) => application.id === applicationIdFromUrl)

    if (exists) {
      setStatusTab('all')
      setSelectedApplicationId(applicationIdFromUrl)
    }
  }, [applicationIdFromUrl, myApplications])

  const handleOpenSend = () => {
    setEditingApplication(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = () => {
    if (!selectedApplication) {
      return
    }

    setEditingApplication(selectedApplication)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingApplication(null)
  }

  const handleSaved = (applicationId: string) => {
    setDrawerOpen(false)
    setEditingApplication(null)
    setStatusTab('all')
    setSelectedApplicationId(applicationId)
  }

  const handleDelete = async () => {
    if (!selectedApplication) {
      return
    }

    const deleted = await removeApplication(selectedApplication.id)

    if (!deleted) {
      return
    }

    setSelectedApplicationId(undefined)
    notification.success({ message: t('applicationSubmit.messages.deleted') })
  }

  if (!isApplicationsHydrated) {
    return <SubmitApplicationPageSkeleton />
  }

  return (
    <RequirePageView pageKey={pageKey}>
      <>
        <div style={fullHeightPageStyle}>
          <ApplicationListStatusTabs
            applications={myApplications}
            activeKey={statusTab}
            onChange={setStatusTab}
          />

          <div style={splitPageRowStyle}>
            <ApplicationChatList
              applications={filteredApplications}
              selectedApplicationId={activeApplicationId}
              onSelect={setSelectedApplicationId}
              onSend={canCreate(pageKey) ? handleOpenSend : undefined}
              emptyListKey={
                myApplications.length === 0
                  ? 'applicationSubmit.emptyList'
                  : 'applicationSubmit.emptyStatusFilter'
              }
            />

            <ApplicationDetail
              application={selectedApplication}
              onEdit={
                canEdit(pageKey) && selectedApplication && !isApplicationLocked
                  ? handleOpenEdit
                  : undefined
              }
              onDelete={
                canDelete(pageKey) && selectedApplication && !isApplicationLocked
                  ? handleDelete
                  : undefined
              }
              showWorkflowPanel
            />
          </div>
        </div>

        {(canCreate(pageKey) || canEdit(pageKey)) && (
          <ApplicationSendDrawer
            key={editingApplication?.id ?? 'create'}
            open={drawerOpen}
            editingApplication={editingApplication}
            onClose={handleCloseDrawer}
            onSaved={handleSaved}
          />
        )}
      </>
    </RequirePageView>
  )
}
