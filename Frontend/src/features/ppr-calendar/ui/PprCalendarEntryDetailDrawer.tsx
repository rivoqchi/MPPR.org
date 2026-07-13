import { CheckOutlined, CloseOutlined, LockOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Button, Descriptions, Drawer, List, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import { useMemo } from 'react'
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
} from '@/features/ppr-calendar/lib/calendar-entries'
import { PprCalendarExecutionTimeline } from '@/features/ppr-calendar/ui/PprCalendarExecutionTimeline'

const { Text } = Typography

interface PprCalendarEntryDetailDrawerProps {
  open: boolean
  entry: PprCalendarEntry | null
  monthApproved: boolean
  onClose: () => void
  onExecute: (entry: PprCalendarEntry) => void
}

export function PprCalendarEntryDetailDrawer({
  open,
  entry,
  monthApproved,
  onClose,
  onExecute,
}: PprCalendarEntryDetailDrawerProps) {
  const { t } = useTranslation()
  const pprTypes = usePprTypesStore((state) => state.pprTypes)
  const objects = useObjectsStore((state) => state.objects)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)

  const pprTypeLabel = useMemo(() => {
    if (!entry) {
      return '—'
    }

    const pprType = pprTypes.find((item) => item.id === entry.pprTypeId)

    return pprType ? `${pprType.shortName} — ${pprType.originalName}` : entry.pprTypeId
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
  const canExecute = Boolean(
    entry && monthApproved && hasIncompleteObjects && canExecutePprDate(entry.date),
  )
  const isExecuteLocked = Boolean(
    entry && monthApproved && hasIncompleteObjects && !canExecutePprDate(entry.date),
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={t('pprCalendar.entryDetail.title')}
      extra={
        entry && monthApproved ? (
          canExecute ? (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => onExecute(entry)}>
              {t('pprCalendar.actions.executePpr')}
            </Button>
          ) : (
            <Tooltip title={t('pprCalendar.messages.executeLocked')}>
              <Button icon={<LockOutlined />} disabled>
                {t('pprCalendar.actions.executePpr')}
              </Button>
            </Tooltip>
          )
        ) : null
      }
    >
      {entry ? (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('pprCalendar.fields.date')}>{entry.date}</Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.fields.pprType')}>{pprTypeLabel}</Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.fields.scope')}>
              <Tag color={entry.scopeType === 'section' ? 'blue' : 'purple'}>{sectionLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.entryDetail.status')}>
              <Tag
                color={
                  executionStatus === 'completed'
                    ? 'success'
                    : executionStatus === 'in_progress'
                      ? 'processing'
                      : 'default'
                }
              >
                {t(`pprCalendar.executionStatus.${executionStatus}`)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pprCalendar.fields.comment')}>
              {entry.comment || '—'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>{t('pprCalendar.entryDetail.completion')}</Text>
              <Text>{completionPercent}%</Text>
            </div>
            <Progress percent={completionPercent} showInfo={false} />
          </div>

          <div>
            <Text strong>{t('pprCalendar.fields.objects')}</Text>
            <List
              style={{ marginTop: 12 }}
              bordered
              dataSource={entry.objectIds}
              renderItem={(objectId) => {
                const object = objects.find((item) => item.id === objectId)
                const completed = isObjectExecuted(entry, objectId)
                const execution = entry.executions?.find((item) => item.objectId === objectId)

                return (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        {completed ? (
                          <CheckOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseOutlined style={{ color: '#ff4d4f' }} />
                        )}
                        <Text>{object?.shortName ?? objectId}</Text>
                        <Tag color={completed ? 'success' : 'default'}>
                          {completed
                            ? t('pprCalendar.entryDetail.objectCompleted')
                            : t('pprCalendar.entryDetail.objectPending')}
                        </Tag>
                      </Space>
                      {execution?.comment ? (
                        <Text type="secondary">{execution.comment}</Text>
                      ) : null}
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

          {isExecuteLocked ? (
            <Text type="secondary">{t('pprCalendar.messages.executeLockedDetail')}</Text>
          ) : null}
        </Space>
      ) : null}
    </Drawer>
  )
}
