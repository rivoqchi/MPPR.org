import { App } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutlet, useSearchParams } from 'react-router-dom'
import type { Application } from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { ApplicationChatList } from '@/features/application-submit/ui/ApplicationChatList'
import { ApplicationDetail } from '@/features/application-submit/ui/ApplicationDetail'
import { ApplicationSendDrawer } from '@/features/application-submit/ui/ApplicationSendDrawer'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useApplicationsHydration } from '@/shared/hooks/useApplicationsHydration'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle, splitPageRowStyle } from '@/shared/lib/page-layout'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { canAccessApplicationWorkflow } from '@/features/application-workflow/lib/workflow-access'
import { isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { SubmitApplicationPageSkeleton } from '@/features/application-submit/ui/SubmitApplicationPageSkeleton'

export function SubmitApplicationPage() {
  const pageKey = '/applications/submit'
  const workflowOutlet = useOutlet()
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const isApplicationsHydrated = useApplicationsHydration()
  const applications = useApplicationsStore((state) => state.applications)
  const removeApplication = useApplicationsStore((state) => state.removeApplication)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const applicationIdFromUrl = searchParams.get('applicationId')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>()

  const myApplications = useMemo(
    () =>
      canViewAll
        ? applications
        : applications.filter((application) => application.createdByUserId === currentUser?.id),
    [applications, canViewAll, currentUser?.id],
  )

  const activeApplicationId = selectedApplicationId ?? myApplications[0]?.id

  const selectedApplication = useMemo(
    () => myApplications.find((application) => application.id === activeApplicationId),
    [activeApplicationId, myApplications],
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

  if (workflowOutlet) {
    return <RequirePageView pageKey={pageKey}>{workflowOutlet}</RequirePageView>
  }

  return (
    <RequirePageView pageKey={pageKey}>
    <>
      <div style={fullHeightPageStyle}>
        <div style={splitPageRowStyle}>
          <ApplicationChatList
            applications={myApplications}
            selectedApplicationId={activeApplicationId}
            onSelect={setSelectedApplicationId}
            onSend={canCreate(pageKey) ? handleOpenSend : undefined}
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
            onOpenWorkflow={
              selectedApplication &&
              canAccessApplicationWorkflow(
                selectedApplication,
                currentUser?.structuralUnitId,
                canViewAll,
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
