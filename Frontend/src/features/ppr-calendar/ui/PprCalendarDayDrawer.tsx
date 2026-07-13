import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Drawer, Empty, List, Popconfirm, theme } from 'antd'
import type { Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'

interface PprCalendarDayDrawerProps {
  open: boolean
  date: Dayjs | null
  entries: PprCalendarEntry[]
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  deleteConfirmTitle?: string
  onClose: () => void
  onAdd: () => void
  onEdit: (entry: PprCalendarEntry) => void
  onOpenEntry: (entry: PprCalendarEntry) => void
  onDelete: (entry: PprCalendarEntry) => Promise<void>
}

export function PprCalendarDayDrawer({
  open,
  date,
  entries,
  canCreate,
  canEdit,
  canDelete,
  deleteConfirmTitle,
  onClose,
  onAdd,
  onEdit,
  onOpenEntry,
  onDelete,
}: PprCalendarDayDrawerProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const pprTypes = usePprTypesStore((state) => state.pprTypes)

  const title = useMemo(
    () => t('pprCalendar.dayDrawer.title', { date: date?.format('DD.MM.YYYY') }),
    [date, t],
  )

  return (
    <Drawer
      title={title}
      placement="top"
      height={360}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        canCreate ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {t('pprCalendar.actions.add')}
          </Button>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <Empty description={t('pprCalendar.dayDrawer.empty')} />
      ) : (
        <List
          dataSource={entries}
          split={<Divider style={{ margin: '14px 0', borderColor: token.colorBorderSecondary }} />}
          renderItem={(entry) => {
            const pprType = pprTypes.find((item) => item.id === entry.pprTypeId)

            return (
              <List.Item
                style={{ padding: '4px 0', borderBlockEnd: 'none' }}
                actions={[
                  <Button key="view" type="link" onClick={() => onOpenEntry(entry)}>
                    {t('common.view')}
                  </Button>,
                  canEdit ? (
                    <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => onEdit(entry)}>
                      {t('common.edit')}
                    </Button>
                  ) : null,
                  canDelete ? (
                    <Popconfirm
                      key="delete"
                      title={deleteConfirmTitle ?? t('pprCalendar.entryModal.deleteConfirm')}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void onDelete(entry)}
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>
                        {t('common.delete')}
                      </Button>
                    </Popconfirm>
                  ) : null,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={pprType?.shortName ?? entry.pprTypeId}
                  description={
                    entry.comment ? (
                      <span style={{ color: token.colorTextSecondary, lineHeight: 1.5 }}>
                        {entry.comment}
                      </span>
                    ) : null
                  }
                />
              </List.Item>
            )
          }}
        />
      )}
    </Drawer>
  )
}
