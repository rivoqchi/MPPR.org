import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { App, Button, Descriptions, Modal, Popconfirm, Space, Tag } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'

interface PprCalendarEntryModalProps {
  open: boolean
  entry: PprCalendarEntry | null
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onEdit: (entry: PprCalendarEntry) => void
  onDelete: (entry: PprCalendarEntry) => Promise<void>
}

export function PprCalendarEntryModal({
  open,
  entry,
  canEdit,
  canDelete,
  onClose,
  onEdit,
  onDelete,
}: PprCalendarEntryModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
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

  const objectLabels = useMemo(() => {
    if (!entry) {
      return '—'
    }

    return (
      entry.objectIds
        .map((objectId) => objects.find((item) => item.id === objectId)?.shortName ?? objectId)
        .join(', ') || '—'
    )
  }, [entry, objects])

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

  const handleDelete = async () => {
    if (!entry) {
      return
    }

    try {
      await onDelete(entry)
      message.success(t('pprCalendar.messages.deleteSuccess'))
      onClose()
    } catch {
      message.error(t('pprCalendar.messages.deleteError'))
    }
  }

  return (
    <Modal
      open={open}
      title={t('pprCalendar.entryModal.title')}
      onCancel={onClose}
      footer={
        <Space>
          {canDelete && entry ? (
            <Popconfirm
              title={t('pprCalendar.entryModal.deleteConfirm')}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleDelete()}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          ) : null}
          {canEdit && entry ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                onEdit(entry)
                onClose()
              }}
            >
              {t('common.edit')}
            </Button>
          ) : null}
          <Button onClick={onClose}>{t('common.close')}</Button>
        </Space>
      }
    >
      {entry ? (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('pprCalendar.fields.date')}>{entry.date}</Descriptions.Item>
          <Descriptions.Item label={t('pprCalendar.fields.pprType')}>{pprTypeLabel}</Descriptions.Item>
          <Descriptions.Item label={t('pprCalendar.fields.objects')}>{objectLabels}</Descriptions.Item>
          <Descriptions.Item label={t('pprCalendar.fields.scope')}>
            <Tag color={entry.scopeType === 'section' ? 'blue' : 'purple'}>{sectionLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pprCalendar.fields.comment')}>
            {entry.comment || '—'}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Modal>
  )
}
