import { CalendarOutlined, CopyOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons'
import { Alert, App, Button, DatePicker, Descriptions, Empty, Image, List, Popconfirm, Space, Tag, Typography, theme } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application, ApplicationAttachment } from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import { useUsersStore } from '@/entities/user/model/users-store'
import {
  downloadApplicationAttachment,
  formatAttachmentSize,
  getAttachmentPreviewUrl,
  isImageAttachment,
  isPreviewableAttachment,
} from '@/features/application-submit/lib/attachment-utils'
import { copyTextToClipboard } from '@/features/application-submit/lib/application-number'
import { getApplicationStatusTagColor, isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { getSpecialMessageForUnit } from '@/features/application-submit/lib/incoming-applications'
import { getWorkflowStatusTagColor } from '@/features/application-workflow/lib/workflow-access'
import { ApplicationSpecialMessageCard } from '@/features/application-submit/ui/ApplicationSpecialMessageCard'
import { ApplicationWorkflowPanel } from '@/features/application-workflow/ui/ApplicationWorkflowPanel'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import {
  getDetailPanelCardStyle,
  splitPanelScrollStyle,
  splitPanelShellStyle,
} from '@/shared/lib/page-layout'

interface ApplicationDetailProps {
  application?: Application
  onEdit?: () => void
  onDelete?: () => void
  detailTitleKey?: string
  selectItemKey?: string
  mode?: 'submit' | 'incoming'
  viewerStructuralUnitId?: string
  canViewAll?: boolean
  showWorkflowPanel?: boolean
}

const headerActionStyle = {
  margin: 0,
  height: 22,
  fontSize: 12,
  paddingInline: 8,
} as const

const headerTagStyle = {
  ...headerActionStyle,
  flexShrink: 0,
  lineHeight: '20px',
  display: 'inline-flex',
  alignItems: 'center',
} as const

export function ApplicationDetail({
  application,
  onEdit,
  onDelete,
  detailTitleKey = 'applicationSubmit.detailTitle',
  selectItemKey = 'applicationSubmit.selectItem',
  mode = 'submit',
  viewerStructuralUnitId,
  canViewAll = false,
  showWorkflowPanel = true,
}: ApplicationDetailProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)
  const updateApplication = useApplicationsStore((state) => state.updateApplication)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [deadlineEditorOpen, setDeadlineEditorOpen] = useState(false)
  const [deadlineSaving, setDeadlineSaving] = useState(false)
  const [deadlineDraft, setDeadlineDraft] = useState<Dayjs | null>(null)

  const handleCopyApplicationNumber = async (value: string) => {
    const copied = await copyTextToClipboard(value)

    if (copied) {
      notification.success({ message: t('applicationSubmit.messages.numberCopied') })
      return
    }

    notification.error({ message: t('applicationSubmit.messages.numberCopyFailed') })
  }

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    setDeadlineEditorOpen(false)
    setDeadlineDraft(null)
  }, [application?.id, application?.deadline])

  const submitter = useMemo(() => {
    if (!application) {
      return undefined
    }

    if (application.createdByFirstName && application.createdByLastName) {
      return {
        firstName: application.createdByFirstName,
        lastName: application.createdByLastName,
        structuralUnitId: application.createdByStructuralUnitId,
      }
    }

    const user = users.find((item) => item.id === application.createdByUserId)

    if (!user) {
      return undefined
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      structuralUnitId: user.structuralUnitId,
    }
  }, [application, users])

  const isFinalized = application ? isApplicationFinalized(application) : false
  const showWorkflowStatus = Boolean(application?.workflowAssignments?.length)

  if (!application) {
    return (
      <div style={{ ...splitPanelShellStyle, background: token.colorBgLayout }}>
        <div
          style={{
            ...splitPanelScrollStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty description={t(selectItemKey)} />
        </div>
      </div>
    )
  }

  const submitterName = submitter ? getUserFullName(submitter) : '—'

  const submitterUnitLabel = submitter?.structuralUnitId
    ? structuralUnits.find((item) => item.id === submitter.structuralUnitId)?.shortName ??
      submitter.structuralUnitId
    : '—'

  const unitLabels = application.structuralUnitIds
    .map((unitId) => {
      const unit = structuralUnits.find((item) => item.id === unitId)

      return unit ? unit.shortName : unitId
    })
    .join(', ')

  const recipientLabels = (application.recipientUserIds ?? [])
    .map((userId) => {
      const user = users.find((item) => item.id === userId)

      return user ? getUserFullName(user) : userId
    })
    .join(', ')

  const canChangeDeadline =
    mode === 'submit' &&
    application.type === 'execution' &&
    !isFinalized &&
    Boolean(onEdit)

  const openDeadlineEditor = () => {
    setDeadlineDraft(application.deadline ? dayjs(application.deadline) : dayjs())
    setDeadlineEditorOpen(true)
  }

  const handleDeadlineSave = async (value: Dayjs | null) => {
    if (!value) {
      return
    }

    setDeadlineSaving(true)

    try {
      await updateApplication(application.id, {
        deadline: value.format('YYYY-MM-DD'),
      })
      setDeadlineDraft(value)
      setDeadlineEditorOpen(false)
      notification.success({ message: t('applicationSubmit.messages.deadlineUpdated') })
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationSubmit.messages.error' })
    } finally {
      setDeadlineSaving(false)
    }
  }

  const disablePastDate = (current: Dayjs) =>
    current ? current.isBefore(dayjs().startOf('day')) : false

  const viewerSpecialMessage =
    mode === 'incoming' && !canViewAll
      ? getSpecialMessageForUnit(application, viewerStructuralUnitId)
      : undefined

  const showAllSpecialMessages =
    mode === 'submit' || (mode === 'incoming' && canViewAll)

  const handleDownload = async (attachment: ApplicationAttachment) => {
    const downloaded = await downloadApplicationAttachment(attachment)

    if (!downloaded) {
      notification.error({
        message: t('applicationSubmit.attachments.downloadUnavailable'),
      })
    }
  }

  const handlePreview = async (attachment: ApplicationAttachment) => {
    if (!isPreviewableAttachment(attachment)) {
      notification.error({
        message: t('applicationSubmit.attachments.previewUnavailable'),
      })
      return
    }

    const url = await getAttachmentPreviewUrl(attachment)

    if (!url) {
      notification.error({
        message: t('applicationSubmit.attachments.previewUnavailable'),
      })
      return
    }

    if (isImageAttachment(attachment)) {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }

      setImagePreviewUrl(url)
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const renderAttachmentList = (attachments: ApplicationAttachment[]) => {
    if (attachments.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('applicationSubmit.attachments.empty')}
        />
      )
    }

    return (
      <List
        bordered
        dataSource={attachments}
        renderItem={(attachment) => (
          <List.Item
            actions={[
              isPreviewableAttachment(attachment) ? (
                <Button
                  key="view"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => void handlePreview(attachment)}
                >
                  {t('applicationSubmit.attachments.view')}
                </Button>
              ) : null,
              <Button
                key="download"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => void handleDownload(attachment)}
              >
                {t('applicationSubmit.attachments.download')}
              </Button>,
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={<FileOutlined style={{ fontSize: 20 }} />}
              title={attachment.name}
              description={formatAttachmentSize(attachment.size)}
            />
          </List.Item>
        )}
      />
    )
  }

  return (
    <div style={{ ...splitPanelShellStyle, background: token.colorBgLayout }}>
      <div style={{ ...splitPanelScrollStyle, padding: '0 15px 15px' }}>
        <div
          style={{
            ...getDetailPanelCardStyle(token),
            paddingTop: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 16,
              width: '100%',
            }}
          >
            <div>
              {application.applicationNumber ? (
                <Space size={6} style={{ marginBottom: 6 }}>
                  <Typography.Text
                    strong
                    style={{ fontSize: 15, color: token.colorPrimary, letterSpacing: 0.2 }}
                  >
                    № {application.applicationNumber}
                  </Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopyApplicationNumber(application.applicationNumber!)}
                    aria-label={t('applicationSubmit.copyNumber')}
                  />
                </Space>
              ) : null}
              <div style={{ fontSize: 22, fontWeight: 700 }}>{t(detailTitleKey)}</div>
              <div style={{ marginTop: 8, color: token.colorTextSecondary }}>
                {dayjs(application.createdAt).format('DD.MM.YYYY HH:mm')}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <Space size={8} wrap style={{ justifyContent: 'flex-end' }}>
                <Tag
                  color={application.type === 'execution' ? 'orange' : 'blue'}
                  style={headerTagStyle}
                >
                  {t(`applicationSubmit.types.${application.type}`)}
                </Tag>
                <Tag
                  color={
                    showWorkflowStatus
                      ? getWorkflowStatusTagColor(application.workflowStatus)
                      : getApplicationStatusTagColor(application.status)
                  }
                  style={headerTagStyle}
                >
                  {showWorkflowStatus
                    ? t(`applicationWorkflow.status.${application.workflowStatus}`)
                    : t(`applicationSubmit.status.${application.status}`)}
                </Tag>
                {onEdit && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={onEdit}
                    style={headerActionStyle}
                  >
                    {t('applicationSubmit.edit')}
                  </Button>
                )}
                {onDelete && (
                  <Popconfirm
                    title={t('applicationSubmit.deleteConfirm')}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    onConfirm={onDelete}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      style={headerActionStyle}
                    >
                      {t('applicationSubmit.delete')}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          </div>

          {isFinalized && (
            <Alert
              type={
                application.status === 'cancelled' || application.workflowStatus === 'cancelled'
                  ? 'warning'
                  : 'success'
              }
              showIcon
              message={
                <span style={{ fontWeight: 700 }}>
                  {application.status === 'cancelled' || application.workflowStatus === 'cancelled'
                    ? t('applicationSubmit.messages.cancelledLockedHint')
                    : t('applicationSubmit.messages.finalizedHint')}
                </span>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {viewerSpecialMessage && (
            <div style={{ marginBottom: 24 }}>
              <ApplicationSpecialMessageCard message={viewerSpecialMessage} />
            </div>
          )}

          <Descriptions
            column={1}
            bordered
            styles={{
              label: {
                width: 220,
                minWidth: 220,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                verticalAlign: 'top',
              },
              content: {
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                verticalAlign: 'top',
              },
            }}
            items={[
              {
                key: 'applicationNumber',
                label: t('applicationSubmit.fields.applicationNumber'),
                children: application.applicationNumber ? (
                  <Space size={6}>
                    <span>{application.applicationNumber}</span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => void handleCopyApplicationNumber(application.applicationNumber!)}
                    />
                  </Space>
                ) : (
                  '—'
                ),
              },
              {
                key: 'submitter',
                label: t('applicationSubmit.fields.submittedBy'),
                children: submitterName,
              },
              {
                key: 'submitterUnit',
                label: t('applicationSubmit.fields.submitterStructuralUnit'),
                children: submitterUnitLabel,
              },
              {
                key: 'recipients',
                label: t('applicationSubmit.fields.recipients'),
                children: recipientLabels || '—',
              },
              ...(unitLabels
                ? [
                    {
                      key: 'units',
                      label: t('applicationSubmit.fields.structuralUnits'),
                      children: unitLabels,
                    },
                  ]
                : []),
              {
                key: 'deadline',
                label: t('applicationSubmit.fields.deadline'),
                children:
                  application.type === 'execution' && application.deadline
                    ? dayjs(application.deadline).format('DD.MM.YYYY')
                    : '—',
              },
              {
                key: 'comment',
                label: t('applicationSubmit.fields.comment'),
                children: application.comment,
              },
            ]}
          />

          {canChangeDeadline && (
            <div style={{ marginTop: 24, position: 'relative' }}>
              {!deadlineEditorOpen ? (
                <Button
                  icon={<CalendarOutlined />}
                  onClick={openDeadlineEditor}
                  style={{ margin: 0 }}
                >
                  {t('applicationSubmit.changeDeadline')}
                </Button>
              ) : (
                <Space wrap size={8} align="center">
                  <DatePicker
                    value={deadlineDraft}
                    onChange={(value) => {
                      setDeadlineDraft(value)
                      void handleDeadlineSave(value)
                    }}
                    disabledDate={disablePastDate}
                    format="DD.MM.YYYY"
                    allowClear={false}
                    open
                    disabled={deadlineSaving}
                    placeholder={t('applicationSubmit.placeholders.deadline')}
                    getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                  />
                  <Button
                    disabled={deadlineSaving}
                    onClick={() => {
                      setDeadlineEditorOpen(false)
                      setDeadlineDraft(null)
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </Space>
              )}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {t('applicationSubmit.fields.images')} ({application.images.length})
            </div>
            {renderAttachmentList(application.images)}
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {t('applicationSubmit.fields.files')} ({application.files.length})
            </div>
            {renderAttachmentList(application.files)}
          </div>

          {showAllSpecialMessages && application.specialMessages.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                {t('applicationSubmit.specialMessage.title')} ({application.specialMessages.length})
              </div>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {application.specialMessages.map((item) => {
                  const unit = structuralUnits.find((unitItem) => unitItem.id === item.structuralUnitId)

                  return (
                    <div
                      key={item.structuralUnitId}
                      style={{
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadiusLG,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>
                        {unit ? unit.shortName : item.structuralUnitId}
                      </div>
                      <div>{item.message}</div>
                    </div>
                  )
                })}
              </Space>
            </div>
          )}

          {showWorkflowPanel ? <ApplicationWorkflowPanel application={application} /> : null}
        </div>
      </div>

      {imagePreviewUrl && (
        <Image
          style={{ display: 'none' }}
          preview={{
            visible: true,
            src: imagePreviewUrl,
            onVisibleChange: (visible) => {
              if (!visible) {
                URL.revokeObjectURL(imagePreviewUrl)
                setImagePreviewUrl(null)
              }
            },
          }}
        />
      )}
    </div>
  )
}
