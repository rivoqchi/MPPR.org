import { App, Empty } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { ApplicationWorkflowWorkspace } from '@/features/application-workflow/ui/ApplicationWorkflowWorkspace'
import { canAccessApplicationWorkflow } from '@/features/application-workflow/lib/workflow-access'
import { filterIncomingApplications } from '@/features/application-submit/lib/incoming-applications'
import { isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { ApplicationDetail } from '@/features/application-submit/ui/ApplicationDetail'
import { ApplicationChatList } from '@/features/application-submit/ui/ApplicationChatList'
import { ApplicationSendDrawer } from '@/features/application-submit/ui/ApplicationSendDrawer'
import { SubmitApplicationPageSkeleton } from '@/features/application-submit/ui/SubmitApplicationPageSkeleton'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { useApplicationsHydration } from '@/shared/hooks/useApplicationsHydration'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { fullHeightPageStyle, splitPageRowStyle } from '@/shared/lib/page-layout'

export type ManagementApplicationsSubtab = 'submitted' | 'incoming' | 'workflow'

interface ManagementApplicationsTabProps {
  subtab: ManagementApplicationsSubtab
  onSubtabChange: (subtab: ManagementApplicationsSubtab) => void
}

export function ManagementApplicationsTab({
  subtab,
  onSubtabChange,
}: ManagementApplicationsTabProps) {
  const submitPageKey = '/applications/submit'
  const incomingPageKey = '/applications/incoming'
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { canCreate, canEdit, canDelete } = useRolePermissions()
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const isApplicationsHydrated = useApplicationsHydration()
  const applications = useApplicationsStore((state) => state.applications)
  const removeApplication = useApplicationsStore((state) => state.removeApplication)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [selectedSubmittedApplicationId, setSelectedSubmittedApplicationId] = useState<string>()
  const [selectedIncomingApplicationId, setSelectedIncomingApplicationId] = useState<string>()
  const [workflowApplicationId, setWorkflowApplicationId] = useState<string>()
  const [workflowSource, setWorkflowSource] = useState<'submitted' | 'incoming'>('submitted')

  const submittedApplications = useMemo(
    () =>
      canViewAll
        ? applications
        : applications.filter((application) => application.createdByUserId === currentUser?.id),
    [applications, canViewAll, currentUser?.id],
  )

  const incomingApplications = useMemo(
    () => filterIncomingApplications(applications, currentUser?.structuralUnitId, canViewAll),
    [applications, canViewAll, currentUser?.structuralUnitId],
  )

  const activeSubmittedApplicationId =
    selectedSubmittedApplicationId ?? submittedApplications[0]?.id
  const selectedSubmittedApplication = useMemo(
    () => submittedApplications.find((application) => application.id === activeSubmittedApplicationId),
    [activeSubmittedApplicationId, submittedApplications],
  )

  const activeIncomingApplicationId = selectedIncomingApplicationId ?? incomingApplications[0]?.id
  const selectedIncomingApplication = useMemo(
    () => incomingApplications.find((application) => application.id === activeIncomingApplicationId),
    [activeIncomingApplicationId, incomingApplications],
  )

  const workflowApplication = useMemo(
    () => applications.find((application) => application.id === workflowApplicationId),
    [applications, workflowApplicationId],
  )

  const workflowTarget =
    workflowApplication ??
    selectedIncomingApplication ??
    selectedSubmittedApplication ??
    submittedApplications[0] ??
    incomingApplications[0]

  const openWorkflow = (application: Application, source: 'submitted' | 'incoming') => {
    setWorkflowApplicationId(application.id)
    setWorkflowSource(source)
    onSubtabChange('workflow')
  }

  const handleOpenSend = () => {
    setEditingApplication(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = () => {
    if (!selectedSubmittedApplication) {
      return
    }

    setEditingApplication(selectedSubmittedApplication)
    setDrawerOpen(true)
  }

  const handleSaved = (applicationId: string) => {
    setDrawerOpen(false)
    setEditingApplication(null)
    setSelectedSubmittedApplicationId(applicationId)
  }

  const handleDelete = async () => {
    if (!selectedSubmittedApplication) {
      return
    }

    const deleted = await removeApplication(selectedSubmittedApplication.id)

    if (!deleted) {
      return
    }

    setSelectedSubmittedApplicationId(undefined)
    notification.success({ message: t('applicationSubmit.messages.deleted') })
  }

  if (!isApplicationsHydrated) {
    return <SubmitApplicationPageSkeleton />
  }

  return (
    <div style={fullHeightPageStyle}>
      <div style={{ ...fullHeightPageStyle, minHeight: 0 }}>
        {subtab === 'submitted' ? (
          <>
            <div style={splitPageRowStyle}>
              <ApplicationChatList
                applications={submittedApplications}
                selectedApplicationId={activeSubmittedApplicationId}
                onSelect={setSelectedSubmittedApplicationId}
                onSend={canCreate(submitPageKey) ? handleOpenSend : undefined}
              />

              <ApplicationDetail
                application={selectedSubmittedApplication}
                onEdit={
                  canEdit(submitPageKey) &&
                  selectedSubmittedApplication &&
                  !isApplicationFinalized(selectedSubmittedApplication)
                    ? handleOpenEdit
                    : undefined
                }
                onDelete={
                  canDelete(submitPageKey) &&
                  selectedSubmittedApplication &&
                  !isApplicationFinalized(selectedSubmittedApplication)
                    ? handleDelete
                    : undefined
                }
                onOpenWorkflow={
                  selectedSubmittedApplication &&
                  canAccessApplicationWorkflow(
                    selectedSubmittedApplication,
                    currentUser?.structuralUnitId,
                    canViewAll,
                  )
                    ? () => openWorkflow(selectedSubmittedApplication, 'submitted')
                    : undefined
                }
              />
            </div>

            {(canCreate(submitPageKey) || canEdit(submitPageKey)) && (
              <ApplicationSendDrawer
                key={editingApplication?.id ?? 'create'}
                open={drawerOpen}
                editingApplication={editingApplication}
                onClose={() => {
                  setDrawerOpen(false)
                  setEditingApplication(null)
                }}
                onSaved={handleSaved}
              />
            )}
          </>
        ) : null}

        {subtab === 'incoming' ? (
          <div style={splitPageRowStyle}>
            <ApplicationChatList
              applications={incomingApplications}
              selectedApplicationId={activeIncomingApplicationId}
              onSelect={setSelectedIncomingApplicationId}
              listTitleKey="applicationIncoming.listTitle"
              emptyListKey="applicationIncoming.emptyList"
              emptySearchKey="applicationIncoming.emptySearch"
            />

            <ApplicationDetail
              application={selectedIncomingApplication}
              detailTitleKey="applicationIncoming.detailTitle"
              selectItemKey="applicationIncoming.selectItem"
              mode="incoming"
              viewerStructuralUnitId={currentUser?.structuralUnitId}
              canViewAll={canViewAll}
              onOpenWorkflow={
                selectedIncomingApplication &&
                canEdit(incomingPageKey) &&
                canAccessApplicationWorkflow(
                  selectedIncomingApplication,
                  currentUser?.structuralUnitId,
                  canViewAll,
                )
                  ? () => openWorkflow(selectedIncomingApplication, 'incoming')
                  : undefined
              }
            />
          </div>
        ) : null}

        {subtab === 'workflow' ? (
          workflowTarget ? (
            <ApplicationWorkflowWorkspace
              applicationId={workflowTarget.id}
              onBack={() => onSubtabChange(workflowSource)}
            />
          ) : (
            <div
              style={{
                ...fullHeightPageStyle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Empty description={t('managementPage.workflowEmptyDescription')} />
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
