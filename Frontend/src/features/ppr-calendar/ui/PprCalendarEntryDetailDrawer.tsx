import { CheckOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Descriptions, Drawer, List, Progress, Space, Tag, Typography, theme } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import {
  canExecutePprDate,
  getEntryCompletionPercent,
  getEntryExecutionStatus,
  getIncompleteObjectIds,
  isObjectExecuted,
  isPprExecutionOverdue,
} from '@/features/ppr-calendar/lib/calendar-entries'
import type { PprExecutionFormSchema } from '@/features/ppr-calendar/model/ppr-execution-form-schema'
import { PprCalendarExecutionForm } from '@/features/ppr-calendar/ui/PprCalendarExecutionForm'
import { PprCalendarExecutionTimeline } from '@/features/ppr-calendar/ui/PprCalendarExecutionTimeline'

const { Text } = Typography
const EXECUTION_FORM_ID = 'ppr-entry-detail-execution-form'

interface PprCalendarEntryDetailDrawerProps {
  open: boolean
  entry: PprCalendarEntry | null
  monthApproved: boolean
  isSaving?: boolean
  onClose: () => void
  onSaveExecution: (
    values: PprExecutionFormSchema,
    images: UploadFile[],
    files: UploadFile[],
  ) => Promise<void>
}

export function PprCalendarEntryDetailDrawer({
  open,
  entry,
  monthApproved,
  isSaving = false,
  onClose,
  onSaveExecution,
}: PprCalendarEntryDetailDrawerProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const pprTypes = usePprTypesStore((state) => state.pprTypes)
  const objects = useObjectsStore((state) => state.objects)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const [isExecutionMode, setIsExecutionMode] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsExecutionMode(false)
    }
  }, [open, entry?.id])

  const pprTypeLabel = useMemo(() => {
    if (!entry) {
      return '—'
    }

    const pprType = pprTypes.find((item) => item.id === entry.pprTypeId)

    return pprType?.shortName || pprType?.originalName || entry.pprTypeId
  }, [entry, pprTypes])

  const sectionLabel = useMemo(() => {
    if (!entry || entry.scopeType !== 'section' || !entry.sectionId) {
      return t('pprCalendar.scope.structure')
    }

    const unit = structuralUnits.find((item) =>
      item.sections.some((section) => section.id === entry.sectionId),
    )
    const section = unit?.sections.find((item) => item.id === entry.sectionId)

    return section?.shortName ?? entry.sectionId
  }, [entry, structuralUnits, t])

  const completionPercent = entry ? getEntryCompletionPercent(entry) : 0
  const executionStatus = entry ? getEntryExecutionStatus(entry) : 'pending'
  const hasIncompleteObjects = entry ? getIncompleteObjectIds(entry).length > 0 : false
  const isOverdue = entry ? isPprExecutionOverdue(entry.date) : false
  const isDateExecutable = entry ? canExecutePprDate(entry.date) : false
  const canExecute = Boolean(
    entry && monthApproved && hasIncompleteObjects && isDateExecutable,
  )
  const showFutureDateLock = Boolean(
    entry && monthApproved && hasIncompleteObjects && !isDateExecutable,
  )

  const statusTagColor = isOverdue
    ? 'error'
    : executionStatus === 'completed'
      ? 'success'
      : executionStatus === 'in_progress'
        ? 'processing'
        : 'default'

  const handleClose = () => {
    if (isSaving) {
      return
    }

    if (isExecutionMode) {
      setIsExecutionMode(false)
      return
    }

    onClose()
  }

  const handleSaveExecution = async (
    values: PprExecutionFormSchema,
    images: UploadFile[],
    files: UploadFile[],
  ) => {
    await onSaveExecution(values, images, files)
    setIsExecutionMode(false)
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      placement="right"
      width={560}
      zIndex={1100}
      title={
        isExecutionMode
          ? t('pprCalendar.executionDrawer.title')
          : t('pprCalendar.entryDetail.title')
      }
      extra={
        !isExecutionMode && canExecute ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setIsExecutionMode(true)}
          >
            {t('pprCalendar.actions.executePpr')}
          </Button>
        ) : null
      }
      footer={
        isExecutionMode ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button disabled={isSaving} onClick={() => setIsExecutionMode(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              loading={isSaving}
              htmlType="submit"
              form={EXECUTION_FORM_ID}
            >
              {t('common.save')}
            </Button>
          </div>
        ) : canExecute ? (
          <Button
            type="primary"
            block
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => setIsExecutionMode(true)}
          >
            {t('pprCalendar.actions.executePpr')}
          </Button>
        ) : null
      }
    >
      {entry && isExecutionMode ? (
        <PprCalendarExecutionForm
          entry={entry}
          active={isExecutionMode}
          isSaving={isSaving}
          formId={EXECUTION_FORM_ID}
          showActions={false}
          onCancel={() => setIsExecutionMode(false)}
          onSave={handleSaveExecution}
        />
      ) : null}

      {entry && !isExecutionMode ? (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {showFutureDateLock ? (
            <Alert type="info" showIcon message={t('pprCalendar.messages.executeLockedDetail')} />
          ) : null}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>{t('pprCalendar.entryDetail.completion')}</Text>
              <Text type={isOverdue ? 'danger' : undefined}>{completionPercent}%</Text>
            </div>
            <Progress
              percent={completionPercent}
              showInfo={false}
              status={isOverdue ? 'exception' : completionPercent === 100 ? 'success' : 'active'}
            />
          </div>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('pprCalendar.fields.date')}>{entry.date}</Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.fields.pprType')}>{pprTypeLabel}</Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.fields.scope')}>
              <Tag color={entry.scopeType === 'section' ? 'blue' : 'purple'}>{sectionLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.entryDetail.status')}>
              <Space wrap>
                <Tag color={statusTagColor}>
                  {t(`pprCalendar.executionStatus.${executionStatus}`)}
                </Tag>
                {isOverdue ? (
                  <Tag color="error">{t('pprCalendar.executionStatus.overdue')}</Tag>
                ) : null}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.fields.comment')}>
              {entry.comment || '—'}
            </Descriptions.Item>
          </Descriptions>

          {isOverdue ? (
            <Text type="danger">{t('pprCalendar.messages.overdueHint')}</Text>
          ) : null}

          <div>
            <Text strong>{t('pprCalendar.fields.objects')}</Text>
            <List
              style={{ marginTop: 12 }}
              bordered
              dataSource={entry.objectIds}
              renderItem={(objectId) => {
                const object = objects.find((item) => item.id === objectId)
                const completed = isObjectExecuted(entry, objectId)

                return (
                  <List.Item>
                    <Space align="center">
                      {completed ? (
                        <CheckOutlined
                          style={{ color: isOverdue ? token.colorError : token.colorSuccess }}
                        />
                      ) : (
                        <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                      )}
                      <Text>{object?.shortName ?? objectId}</Text>
                    </Space>
                  </List.Item>
                )
              }}
            />
          </div>

          <div>
            <Text strong>{t('pprCalendar.entryDetail.timelineTitle')}</Text>
            <div style={{ marginTop: 12 }}>
              <PprCalendarExecutionTimeline entry={entry} />
            </div>
          </div>
        </Space>
      ) : null}
    </Drawer>
  )
}
