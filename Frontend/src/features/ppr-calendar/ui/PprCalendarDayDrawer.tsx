import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Drawer, Empty, Popconfirm, Progress, Space, theme } from 'antd'
import type { Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import {
  getEntryCompletionPercent,
  isPprExecutionOverdue,
} from '@/features/ppr-calendar/lib/calendar-entries'

interface PprCalendarDayDrawerProps {
  open: boolean
  date: Dayjs | null
  entries: PprCalendarEntry[]
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  showExecutionProgress?: boolean
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
  showExecutionProgress = false,
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

  const getPprTypeShortName = (entry: PprCalendarEntry) => {
    const pprType = pprTypes.find((item) => item.id === entry.pprTypeId)

    return pprType?.shortName || pprType?.originalName || entry.pprTypeId
  }

  return (
    <Drawer
      title={title}
      placement="top"
      height={360}
      open={open}
      onClose={onClose}
      destroyOnHidden
      zIndex={1000}
      styles={{
        body: {
          background: token.colorBgLayout,
          padding: 16,
        },
      }}
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {entries.map((entry) => {
            const completionPercent = getEntryCompletionPercent(entry)
            const isOverdue = showExecutionProgress && isPprExecutionOverdue(entry.date)

            return (
              <Card
                key={entry.id}
                size="small"
                hoverable
                onClick={() => onOpenEntry(entry)}
                styles={{
                  body: { padding: 14 },
                }}
                style={{
                  cursor: 'pointer',
                  borderColor: isOverdue
                    ? token.colorErrorBorder
                    : completionPercent === 100
                      ? token.colorSuccessBorder
                      : token.colorBorderSecondary,
                }}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getPprTypeShortName(entry)}
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        color: isOverdue ? token.colorError : token.colorTextSecondary,
                        fontSize: 12,
                      }}
                    >
                      <span>{t('pprCalendar.dayDrawer.progress')}</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <Progress
                      percent={completionPercent}
                      size="small"
                      showInfo={false}
                      status={
                        isOverdue
                          ? 'exception'
                          : completionPercent === 100
                            ? 'success'
                            : 'active'
                      }
                      strokeColor={
                        isOverdue
                          ? token.colorError
                          : completionPercent === 100
                            ? token.colorSuccess
                            : completionPercent > 0
                              ? token.colorPrimary
                              : undefined
                      }
                    />
                  </div>

                  {(canEdit || canDelete) ? (
                    <Space
                      wrap
                      size={8}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {canEdit ? (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => onEdit(entry)}
                        >
                          {t('common.edit')}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Popconfirm
                          title={deleteConfirmTitle ?? t('pprCalendar.entryModal.deleteConfirm')}
                          okText={t('common.delete')}
                          cancelText={t('common.cancel')}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => void onDelete(entry)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            {t('common.delete')}
                          </Button>
                        </Popconfirm>
                      ) : null}
                    </Space>
                  ) : null}
                </Space>
              </Card>
            )
          })}
        </div>
      )}
    </Drawer>
  )
}
