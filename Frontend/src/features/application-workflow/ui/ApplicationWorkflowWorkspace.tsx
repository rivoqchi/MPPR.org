import { ArrowLeftOutlined } from '@ant-design/icons'
import { App, Button, Empty, Spin, Tag, theme } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Application,
  ApplicationAttachment,
  ApplicationWorkflowMessage,
} from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import {
  cancelApplicationWorkflow,
  confirmApplicationWorkflow,
  fetchApplicationWorkflow,
  sendWorkflowMessage,
  updateWorkflowStatus,
} from '@/shared/api/application-workflow-api'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import { PAGE_CONTENT_PADDING, fullHeightPageStyle } from '@/shared/lib/page-layout'
import {
  appendWorkflowMessage,
  subscribeWorkflowMessages,
} from '@/shared/lib/realtime/workflow-realtime'
import {
  canAccessApplicationWorkflow,
  getWorkflowStatusTagColor,
} from '@/features/application-workflow/lib/workflow-access'
import {
  canSubmitterFinalizeApplication,
  canUpdateWorkflowUnitStatus,
  getWorkflowUnitStatus,
  isWorkflowFinalized,
} from '@/features/application-workflow/lib/workflow-unit-status'
import {
  ApplicationWorkflowFinalizeModal,
} from '@/features/application-workflow/ui/ApplicationWorkflowFinalizeModal'
import { WorkflowChatComposer, WorkflowMessageList } from '@/features/application-workflow/ui/WorkflowChat'
import { ApplicationWorkflowUnitStatusList } from '@/features/application-workflow/ui/ApplicationWorkflowUnitStatusList'
import { WorkflowStatusSelect } from '@/features/application-workflow/ui/WorkflowStatusSelect'

interface ApplicationWorkflowWorkspaceProps {
  applicationId?: string
  onBack?: () => void
}

export function ApplicationWorkflowWorkspace({
  applicationId,
  onBack,
}: ApplicationWorkflowWorkspaceProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { notification } = App.useApp()
  const { currentUser, canViewAll } = useStructuralUnitScope()
  const applications = useApplicationsStore((state) => state.applications)
  const setApplications = useApplicationsStore((state) => state.setApplications)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeAction, setFinalizeAction] = useState<'confirm' | 'cancel' | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [messages, setMessages] = useState<ApplicationWorkflowMessage[]>([])

  const applicationFromStore = useMemo(
    () => applications.find((item) => item.id === applicationId),
    [applicationId, applications],
  )

  const loadWorkflow = useCallback(async () => {
    if (!applicationId) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const data = await fetchApplicationWorkflow(applicationId)
      setApplication(data.application)
      setMessages(data.messages)
    } catch {
      notification.error({ message: t('applicationWorkflow.messages.loadError') })
      onBack?.()
    } finally {
      setLoading(false)
    }
  }, [applicationId, notification, onBack, t])

  useEffect(() => {
    void loadWorkflow()
  }, [loadWorkflow])

  useEffect(() => {
    if (!applicationFromStore) {
      return
    }

    setApplication((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        status: applicationFromStore.status,
        workflowStatus: applicationFromStore.workflowStatus,
        workflowUnitStatuses: applicationFromStore.workflowUnitStatuses,
        confirmationFiles: applicationFromStore.confirmationFiles,
        updatedAt: applicationFromStore.updatedAt,
      }
    })
  }, [
    applicationFromStore?.confirmationFiles,
    applicationFromStore?.status,
    applicationFromStore?.updatedAt,
    applicationFromStore?.workflowStatus,
    applicationFromStore?.workflowUnitStatuses,
  ])

  useEffect(() => {
    if (!applicationId) {
      return
    }

    return subscribeWorkflowMessages(({ applicationId: eventApplicationId, message }) => {
      if (eventApplicationId !== applicationId) {
        return
      }

      setMessages((current) => appendWorkflowMessage(current, message))
    })
  }, [applicationId])

  const hasAccess = useMemo(() => {
    const target = application ?? applicationFromStore

    if (!target) {
      return false
    }

    return canAccessApplicationWorkflow(target, currentUser?.structuralUnitId, canViewAll)
  }, [application, applicationFromStore, canViewAll, currentUser?.structuralUnitId])

  const workflowTarget = application ?? applicationFromStore

  const viewerUnitStatus = useMemo(
    () =>
      workflowTarget
        ? getWorkflowUnitStatus(workflowTarget, currentUser?.structuralUnitId)
        : undefined,
    [currentUser?.structuralUnitId, workflowTarget],
  )

  const canEditUnitStatus = useMemo(() => {
    if (!workflowTarget) {
      return false
    }

    return canUpdateWorkflowUnitStatus(workflowTarget, currentUser?.structuralUnitId)
  }, [currentUser?.structuralUnitId, workflowTarget])

  const canFinalizeApplication = useMemo(() => {
    if (!workflowTarget) {
      return false
    }

    return canSubmitterFinalizeApplication(workflowTarget, currentUser?.structuralUnitId)
  }, [currentUser?.structuralUnitId, workflowTarget])

  const isFinalized = useMemo(
    () => Boolean(workflowTarget && isWorkflowFinalized(workflowTarget.workflowStatus)),
    [workflowTarget],
  )

  const updateApplicationInStore = useCallback(
    (updated: Application) => {
      setApplication(updated)
      setApplications(applications.map((item) => (item.id === updated.id ? updated : item)))
    },
    [applications, setApplications],
  )

  const handleSend = async (content: string, attachments: ApplicationAttachment[]) => {
    if (!applicationId) {
      return
    }

    setSending(true)

    try {
      const message = await sendWorkflowMessage(applicationId, { content, attachments })
      setMessages((current) => appendWorkflowMessage(current, message))
    } catch {
      notification.error({ message: t('applicationWorkflow.messages.sendError') })
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (
    workflowStatus: Application['workflowStatus'],
    confirmationFiles?: ApplicationAttachment[],
  ) => {
    if (!applicationId || !application) {
      return
    }

    setStatusUpdating(true)

    try {
      const updated = await updateWorkflowStatus(applicationId, {
        workflowStatus,
        confirmationFiles,
      })

      updateApplicationInStore(updated)

      notification.success({ message: t('applicationWorkflow.messages.statusUpdated') })
    } catch {
      notification.error({ message: t('applicationWorkflow.messages.statusError') })
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleFinalize = async () => {
    if (!applicationId || !finalizeAction) {
      return
    }

    setFinalizing(true)

    try {
      const updated =
        finalizeAction === 'confirm'
          ? await confirmApplicationWorkflow(applicationId)
          : await cancelApplicationWorkflow(applicationId)

      updateApplicationInStore(updated)
      setFinalizeAction(null)

      notification.success({
        message: t(`applicationWorkflow.messages.${finalizeAction}Success`),
      })
    } catch {
      notification.error({
        message: t(`applicationWorkflow.messages.${finalizeAction}Error`),
      })
    } finally {
      setFinalizing(false)
    }
  }

  const pageShellStyle = {
    ...fullHeightPageStyle,
    background: token.colorBgLayout,
  } as const

  const headerStyle = {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 12,
    rowGap: 12,
    padding: PAGE_CONTENT_PADDING,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  }

  if (!applicationId) {
    return <Empty description={t('managementPage.workflowEmptyDescription')} />
  }

  if (loading) {
    return (
      <div style={{ ...pageShellStyle, alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!application || !hasAccess) {
    return (
      <div style={{ ...pageShellStyle, alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={t('applicationWorkflow.forbidden')} />
      </div>
    )
  }

  return (
    <div style={pageShellStyle}>
      <div style={headerStyle}>
        {onBack ? (
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            {t('managementPage.backToApplications')}
          </Button>
        ) : null}
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {t('applicationWorkflow.title')}
          </div>
          <div
            style={{
              marginTop: 4,
              color: token.colorTextSecondary,
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {t(`applicationSubmit.types.${application.type}`)}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            marginLeft: 'auto',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <span style={{ color: token.colorTextSecondary, whiteSpace: 'nowrap' }}>
            {t('applicationWorkflow.statusLabel')}:
          </span>
          {canEditUnitStatus && viewerUnitStatus ? (
            <WorkflowStatusSelect
              status={viewerUnitStatus.workflowStatus}
              confirmationFiles={viewerUnitStatus.confirmationFiles}
              onStatusChange={handleStatusChange}
              loading={statusUpdating}
            />
          ) : (
            <Tag color={getWorkflowStatusTagColor(application.workflowStatus)} style={{ margin: 0 }}>
              {t(`applicationWorkflow.status.${application.workflowStatus}`)}
            </Tag>
          )}
          {canFinalizeApplication ? (
            <>
              <Button danger onClick={() => setFinalizeAction('cancel')}>
                {t('applicationWorkflow.actions.cancel')}
              </Button>
              <Button type="primary" onClick={() => setFinalizeAction('confirm')}>
                {t('applicationWorkflow.actions.confirm')}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div
        style={{
          padding: `0 ${PAGE_CONTENT_PADDING}px`,
          flexShrink: 0,
        }}
      >
        <ApplicationWorkflowUnitStatusList
          application={application}
          highlightStructuralUnitId={currentUser?.structuralUnitId}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: `${PAGE_CONTENT_PADDING}px 0`,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ padding: '48px 0' }}>
            <Empty description={t('applicationWorkflow.emptyMessages')} />
          </div>
        ) : (
          <WorkflowMessageList messages={messages} currentUserId={currentUser?.id} />
        )}
      </div>

      {!isFinalized ? <WorkflowChatComposer onSend={handleSend} sending={sending} /> : null}

      <ApplicationWorkflowFinalizeModal
        open={finalizeAction !== null}
        action={finalizeAction ?? 'confirm'}
        isSubmitting={finalizing}
        onClose={() => setFinalizeAction(null)}
        onConfirm={handleFinalize}
      />
    </div>
  )
}
