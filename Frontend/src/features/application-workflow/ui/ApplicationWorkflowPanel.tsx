import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  MessageOutlined,
  SaveOutlined,
  SendOutlined,
  ShareAltOutlined,
  UnlockOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { App, Button, Input, Select, Space, Tag, Upload, theme } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Application,
  ApplicationAttachment,
  ApplicationWorkflowMessage,
} from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import { toApplicationAttachments } from '@/features/application-submit/lib/attachment-utils'
import {
  findSupervisedAssignments,
  findUserWorkflowAssignment,
  getAssignmentStatusLabelKey,
} from '@/features/application-workflow/lib/workflow-assignments'
import { isWorkflowFinalized } from '@/features/application-workflow/lib/workflow-unit-status'
import { WorkflowMessageList } from '@/features/application-workflow/ui/WorkflowChat'
import {
  acceptApplicationWorkflow,
  fetchApplicationWorkflow,
  forwardApplicationWorkflow,
  releaseApplicationWorkflow,
  replyApplicationWorkflow,
  updateWorkflowReplyMessage,
} from '@/shared/api/application-workflow-api'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import {
  appendWorkflowMessage,
  subscribeWorkflowMessages,
} from '@/shared/lib/realtime/workflow-realtime'
import { buildRecipientUserSelectGroups, filterRecipientUserSelectOption } from '@/features/application-submit/lib/recipient-user-select'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'

interface ApplicationWorkflowPanelProps {
  application: Application
}

export function ApplicationWorkflowPanel({ application: initialApplication }: ApplicationWorkflowPanelProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { notification, modal } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const currentUser = useAuthStore((state) => state.currentUser)
  const users = useUsersStore((state) => state.users)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

  const [application, setApplication] = useState(initialApplication)
  const [messages, setMessages] = useState<ApplicationWorkflowMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [editingReply, setEditingReply] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardUserId, setForwardUserId] = useState<string>()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])

  const syncApplication = useCallback((next: Application) => {
    setApplication(next)
    useApplicationsStore.setState((state) => ({
      applications: state.applications.map((item) => (item.id === next.id ? next : item)),
    }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const data = await fetchApplicationWorkflow(initialApplication.id)
      setApplication(data.application)
      setMessages(data.messages)
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationWorkflow.messages.loadError' })
    } finally {
      setLoading(false)
    }
  }, [initialApplication.id, notifyApiError])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setApplication(initialApplication)
  }, [initialApplication])

  useEffect(() => {
    return subscribeWorkflowMessages(initialApplication.id, (message) => {
      setMessages((prev) => appendWorkflowMessage(prev, message))
    })
  }, [initialApplication.id])

  const myAssignment = useMemo(
    () => findUserWorkflowAssignment(application.workflowAssignments, currentUser?.id),
    [application.workflowAssignments, currentUser?.id],
  )

  const supervised = useMemo(
    () => findSupervisedAssignments(application.workflowAssignments, currentUser?.id),
    [application.workflowAssignments, currentUser?.id],
  )

  const isSubmitter = application.createdByUserId === currentUser?.id
  const finalized = isWorkflowFinalized(application.workflowStatus)

  const myReply = useMemo(
    () =>
      myAssignment?.replyMessageId
        ? messages.find((item) => item.id === myAssignment.replyMessageId)
        : undefined,
    [messages, myAssignment?.replyMessageId],
  )

  const forwardOptions = useMemo(
    () =>
      buildRecipientUserSelectGroups({
        users,
        structuralUnits,
        excludeUserIds: [
          currentUser?.id,
          application.createdByUserId,
          ...(application.workflowAssignments ?? []).map((item) => item.userId),
        ].filter(Boolean) as string[],
      }),
    [application.createdByUserId, application.workflowAssignments, currentUser?.id, structuralUnits, users],
  )

  const resetComposer = () => {
    setContent('')
    setFiles([])
    setReplyOpen(false)
    setEditingReply(false)
  }

  const handleAccept = async () => {
    setBusy(true)

    try {
      const result = await acceptApplicationWorkflow(application.id)
      syncApplication(result.application)
      notification.success({ message: t('applicationWorkflow.messages.accepted') })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationWorkflow.messages.error' })
    } finally {
      setBusy(false)
    }
  }

  const handleForward = async () => {
    if (!forwardUserId) {
      return
    }

    setBusy(true)

    try {
      const result = await forwardApplicationWorkflow(application.id, forwardUserId)
      syncApplication(result.application)
      setForwardOpen(false)
      setForwardUserId(undefined)
      notification.success({ message: t('applicationWorkflow.messages.forwarded') })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationWorkflow.messages.error' })
    } finally {
      setBusy(false)
    }
  }

  const handleReply = async () => {
    setBusy(true)

    try {
      const attachments = await toApplicationAttachments(files, [], 'file')
      const imageAttachments = await toApplicationAttachments(
        files.filter((file) => file.type?.startsWith('image/')),
        [],
        'image',
      )
      const allAttachments: ApplicationAttachment[] = [
        ...imageAttachments,
        ...attachments.filter((item) => !item.mimeType.startsWith('image/')),
      ]

      if (editingReply && myReply) {
        const message = await updateWorkflowReplyMessage(application.id, myReply.id, {
          content,
          attachments: allAttachments,
        })
        setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)))
        notification.success({ message: t('applicationWorkflow.messages.replyUpdated') })
      } else {
        const result = await replyApplicationWorkflow(application.id, {
          content,
          attachments: allAttachments,
        })
        syncApplication(result.application)
        setMessages((prev) => appendWorkflowMessage(prev, result.message))
        notification.success({ message: t('applicationWorkflow.messages.replied') })
      }

      resetComposer()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationWorkflow.messages.error' })
    } finally {
      setBusy(false)
    }
  }

  const handleRelease = async (assignmentId?: string) => {
    setBusy(true)

    try {
      const result = await releaseApplicationWorkflow(application.id, assignmentId)
      syncApplication(result.application)
      notification.success({
        message: t(
          result.application.workflowStatus === 'confirmed'
            ? 'applicationWorkflow.messages.closed'
            : 'applicationWorkflow.messages.released',
        ),
      })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationWorkflow.messages.error' })
    } finally {
      setBusy(false)
    }
  }

  const confirmRelease = (assignmentId?: string, closeApplication = false) => {
    modal.confirm({
      title: t(
        closeApplication
          ? 'applicationWorkflow.releaseModal.closeTitle'
          : 'applicationWorkflow.releaseModal.title',
      ),
      content: t(
        closeApplication
          ? 'applicationWorkflow.releaseModal.closeMessage'
          : 'applicationWorkflow.releaseModal.message',
      ),
      okText: t('applicationWorkflow.releaseModal.ok'),
      cancelText: t('common.cancel'),
      centered: true,
      okButtonProps: { danger: closeApplication },
      onOk: () => handleRelease(assignmentId),
    })
  }

  const openEditReply = () => {
    if (!myReply) {
      return
    }

    setContent(myReply.content)
    setFiles([])
    setEditingReply(true)
    setReplyOpen(true)
  }

  if (loading) {
    return (
      <div style={{ marginTop: 24, color: token.colorTextSecondary }}>
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div
      style={{
        marginTop: 24,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        paddingTop: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{t('applicationWorkflow.title')}</div>
        {myAssignment ? (
          <Tag>{t(getAssignmentStatusLabelKey(myAssignment.status))}</Tag>
        ) : null}
      </div>

      <WorkflowMessageList messages={messages} currentUserId={currentUser?.id} />

      {!finalized && (
        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
          {myAssignment?.status === 'pending_accept' && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={busy}
              onClick={() => void handleAccept()}
            >
              {t('applicationWorkflow.actions.accept')}
            </Button>
          )}

          {(myAssignment?.status === 'accepted' || myAssignment?.status === 'replied') && (
            <Space wrap>
              {myAssignment.status === 'accepted' && (
                <>
                  <Button
                    icon={<ShareAltOutlined />}
                    onClick={() => setForwardOpen((value) => !value)}
                  >
                    {t('applicationWorkflow.actions.forward')}
                  </Button>
                  <Button type="primary" icon={<MessageOutlined />} onClick={() => setReplyOpen(true)}>
                    {t('applicationWorkflow.actions.reply')}
                  </Button>
                </>
              )}
              {myAssignment.status === 'replied' && myReply && (
                <Button icon={<EditOutlined />} onClick={openEditReply}>
                  {t('applicationWorkflow.actions.editReply')}
                </Button>
              )}
            </Space>
          )}

          {forwardOpen && myAssignment?.status === 'accepted' && (
            <Space.Compact style={{ width: '100%' }}>
              <Select
                showSearch
                style={{ flex: 1 }}
                placeholder={t('applicationWorkflow.placeholders.forwardUser')}
                options={forwardOptions}
                value={forwardUserId}
                onChange={setForwardUserId}
                filterOption={filterRecipientUserSelectOption}
                optionFilterProp="label"
              />
              <Button
                type="primary"
                icon={<ShareAltOutlined />}
                loading={busy}
                disabled={!forwardUserId}
                onClick={() => void handleForward()}
              >
                {t('applicationWorkflow.actions.forwardConfirm')}
              </Button>
            </Space.Compact>
          )}

          {replyOpen && (
            <div
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                padding: 12,
              }}
            >
              <Input.TextArea
                rows={4}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t('applicationWorkflow.messagePlaceholder')}
              />
              <div style={{ marginTop: 8 }}>
                <Upload
                  multiple
                  beforeUpload={() => false}
                  fileList={files}
                  onChange={({ fileList }) => setFiles(fileList)}
                >
                  <Button icon={<UploadOutlined />}>{t('applicationWorkflow.actions.attach')}</Button>
                </Upload>
              </div>
              <Space style={{ marginTop: 12 }}>
                <Button icon={<CloseOutlined />} onClick={resetComposer}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="primary"
                  icon={editingReply ? <SaveOutlined /> : <SendOutlined />}
                  loading={busy}
                  disabled={!content.trim() && files.length === 0}
                  onClick={() => void handleReply()}
                >
                  {editingReply
                    ? t('applicationWorkflow.actions.saveReply')
                    : t('applicationWorkflow.actions.sendReply')}
                </Button>
              </Space>
            </div>
          )}

          {supervised.map((item) => {
            const user = users.find((candidate) => candidate.id === item.userId)

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorFillAlter,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {user ? getUserFullName(user) : item.userId}
                  </div>
                  <div style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                    {t(getAssignmentStatusLabelKey(item.status))}
                  </div>
                </div>
                <Button
                  icon={<UnlockOutlined />}
                  loading={busy}
                  onClick={() => confirmRelease(item.id)}
                >
                  {t('applicationWorkflow.actions.release')}
                </Button>
              </div>
            )
          })}

          {isSubmitter && supervised.length === 0 && (application.workflowAssignments ?? []).some((item) => item.status === 'replied') && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={busy}
              onClick={() => confirmRelease(undefined, true)}
            >
              {t('applicationWorkflow.actions.releaseAndClose')}
            </Button>
          )}
        </Space>
      )}

      {finalized && (
        <Tag color={application.workflowStatus === 'confirmed' ? 'green' : 'red'} style={{ marginTop: 12 }}>
          {t(`applicationWorkflow.status.${application.workflowStatus}`)}
        </Tag>
      )}
    </div>
  )
}
