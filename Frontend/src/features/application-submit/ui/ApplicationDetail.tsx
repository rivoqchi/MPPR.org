import { CopyOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileOutlined, MessageOutlined } from '@ant-design/icons'
import { Alert, App, Button, Descriptions, Empty, Image, List, Popconfirm, Space, Steps, Tag, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application, ApplicationAttachment } from '@/entities/application/model/types'
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
import { getApplicationStatusTagColor, hasApplicationWorkflow, isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { getSpecialMessageForUnit } from '@/features/application-submit/lib/incoming-applications'
import { ApplicationWorkflowUnitStatusList } from '@/features/application-workflow/ui/ApplicationWorkflowUnitStatusList'
import { getWorkflowStatusTagColor } from '@/features/application-workflow/lib/workflow-access'
import { ensureApplicationWorkflowUnitStatuses } from '@/features/application-workflow/lib/workflow-unit-status'
import { ApplicationSpecialMessageCard } from '@/features/application-submit/ui/ApplicationSpecialMessageCard'
import {
  getDetailPanelCardStyle,
  splitPanelScrollStyle,
  splitPanelShellStyle,
} from '@/shared/lib/page-layout'

interface ApplicationDetailProps {
  application?: Application
  onEdit?: () => void
  onDelete?: () => void
  onOpenWorkflow?: () => void
  detailTitleKey?: string
  selectItemKey?: string
  mode?: 'submit' | 'incoming'
  viewerStructuralUnitId?: string
  canViewAll?: boolean
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
  onOpenWorkflow,
  detailTitleKey = 'applicationSubmit.detailTitle',
  selectItemKey = 'applicationSubmit.selectItem',
  mode = 'submit',
  viewerStructuralUnitId,
  canViewAll = false,
}: ApplicationDetailProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

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

  const workflowUnitStatuses = useMemo(
    () => (application ? ensureApplicationWorkflowUnitStatuses(application) : []),
    [application],
  )

  const showWorkflowStatus = application ? hasApplicationWorkflow(application) : false
  const isFinalized = application ? isApplicationFinalized(application) : false
  const progressStepItems = useMemo(
    () => {
      if (!application) {
        return []
      }

      return [
        { key: 'submitted', title: t('applicationSubmit.progress.submitted') },
        {
          key: 'in_progress_work',
          title: t('applicationSubmit.progress.inProgress'),
          description:
            application.workflowStatus === 'returned'
              ? t('applicationWorkflow.status.returned')
              : application.workflowStatus === 'in_progress_work' ||
                  application.workflowStatus === 'pending_confirmation'
                ? showWorkflowStatus
                  ? t(`applicationWorkflow.status.${application.workflowStatus}`)
                  : t(`applicationSubmit.status.${application.status}`)
                : undefined,
          status:
            application.workflowStatus === 'returned'
              ? ('error' as const)
              : application.workflowStatus === 'in_progress_work' ||
                  application.workflowStatus === 'pending_confirmation'
                ? ('process' as const)
                : ('finish' as const),
        },
        {
          key: 'finalized',
          title: t('applicationSubmit.progress.finalized'),
          status:
            application.workflowStatus === 'confirmed'
              ? ('finish' as const)
              : application.workflowStatus === 'cancelled'
                ? ('error' as const)
                : ('wait' as const),
        },
      ]
    },
    [application, showWorkflowStatus, t],
  )

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

  const sectionLabel = (() => {
    if (application.submissionMode !== 'single' || !application.structuralUnitSectionId) {
      return null
    }

    const unit = structuralUnits.find((item) => item.id === application.structuralUnitIds[0])
    const section = unit?.sections.find(
      (item) => item.id === application.structuralUnitSectionId,
    )

    return section ? section.shortName || section.originalName : application.structuralUnitSectionId
  })()

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
                {onOpenWorkflow && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={onOpenWorkflow}
                    style={headerActionStyle}
                  >
                    {t('applicationWorkflow.open')}
                  </Button>
                )}
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

          <div style={{ marginBottom: 24 }}>
            <Steps
              responsive
              current={
                application.workflowStatus === 'confirmed' || application.workflowStatus === 'cancelled'
                  ? 2
                  : 1
              }
              items={progressStepItems}
            />
          </div>

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
                key: 'submissionMode',
                label: t('applicationSubmit.fields.submissionMode'),
                children: t(`applicationSubmit.submissionModes.${application.submissionMode}`),
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
                key: 'units',
                label:
                  application.submissionMode === 'single'
                    ? t('applicationSubmit.fields.structuralUnit')
                    : t('applicationSubmit.fields.structuralUnits'),
                children: unitLabels,
              },
              ...(sectionLabel
                ? [
                    {
                      key: 'section',
                      label: t('applicationSubmit.fields.section'),
                      children: sectionLabel,
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

          {workflowUnitStatuses.length > 0 && (
            <ApplicationWorkflowUnitStatusList
              application={application}
              highlightStructuralUnitId={mode === 'incoming' ? viewerStructuralUnitId : undefined}
            />
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
