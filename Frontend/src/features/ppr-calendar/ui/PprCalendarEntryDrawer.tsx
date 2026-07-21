import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Drawer, Form, Input, Select, Space } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Dayjs } from 'dayjs'
import type { PprCalendarEntry, PprCalendarViewScope } from '@/entities/ppr-calendar/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import {
  filterPprTypesForUser,
  filterPprTypesForViewScope,
} from '@/entities/ppr-type/lib/ppr-type-scope'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import { getViewScopeLabel, entryToFormScope, viewScopeToEntryFormScope } from '@/features/ppr-calendar/lib/calendar-entries'
import {
  pprCalendarEntryFormSchema,
  type PprCalendarEntryFormSchema,
} from '@/features/ppr-calendar/model/ppr-calendar-entry-form-schema'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'

interface PprCalendarEntryDrawerProps {
  open: boolean
  date: Dayjs | null
  structuralUnit: StructuralUnit | null
  viewScope?: PprCalendarViewScope
  editingEntry?: PprCalendarEntry | null
  onClose: () => void
  onSave: (values: PprCalendarEntryFormSchema) => Promise<void>
}

const DEFAULT_VIEW_SCOPE: PprCalendarViewScope = { type: 'structure' }

function buildDefaultValues(
  viewScope: PprCalendarViewScope | undefined,
  editingEntry?: PprCalendarEntry | null,
): PprCalendarEntryFormSchema {
  if (editingEntry) {
    return {
      pprTypeId: editingEntry.pprTypeId,
      objectIds: editingEntry.objectIds,
      comment: editingEntry.comment,
      ...entryToFormScope(editingEntry),
    }
  }

  const scopeValues = viewScopeToEntryFormScope(viewScope)

  return {
    pprTypeId: '',
    objectIds: [],
    comment: '',
    ...scopeValues,
  }
}

export function PprCalendarEntryDrawer({
  open,
  date,
  structuralUnit,
  viewScope,
  editingEntry,
  onClose,
  onSave,
}: PprCalendarEntryDrawerProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const pprTypes = usePprTypesStore((state) => state.pprTypes)
  const objects = useObjectsStore((state) => state.objects)
  const { currentUser, users, canViewAll } = useStructuralUnitScope()
  const resolvedViewScope = viewScope ?? DEFAULT_VIEW_SCOPE
  const [isSaving, setIsSaving] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PprCalendarEntryFormSchema>({
    resolver: zodResolver(pprCalendarEntryFormSchema),
    defaultValues: buildDefaultValues(resolvedViewScope),
  })

  const scopeLabel = useMemo(
    () =>
      getViewScopeLabel(resolvedViewScope, structuralUnit ?? undefined, {
        structure: t('pprCalendar.scope.structure'),
        section: t('pprCalendar.scope.section'),
      }),
    [structuralUnit, t, resolvedViewScope],
  )

  const pprTypeOptions = useMemo(() => {
    if (!structuralUnit) {
      return []
    }

    const visiblePprTypes = filterPprTypesForUser(pprTypes, currentUser, users, canViewAll)
    const scopedPprTypes = filterPprTypesForViewScope(
      visiblePprTypes,
      resolvedViewScope,
      structuralUnit.id,
      users,
    )

    return scopedPprTypes.map((item) => ({
      value: item.id,
      label: `${item.shortName} — ${item.originalName}`,
    }))
  }, [canViewAll, currentUser, pprTypes, structuralUnit, users, resolvedViewScope])

  const objectOptions = useMemo(
    () =>
      objects.map((item) => ({
        value: item.id,
        label: item.shortName,
      })),
    [objects],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    reset(buildDefaultValues(resolvedViewScope, editingEntry))
  }, [open, editingEntry, reset, resolvedViewScope])

  const handleClose = () => {
    reset(buildDefaultValues(resolvedViewScope))
    onClose()
  }

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true)

    try {
      await onSave(values)
      message.success(
        editingEntry
          ? t('pprCalendar.messages.updateSuccess')
          : t('pprCalendar.messages.createSuccess'),
      )
      handleClose()
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsSaving(false)
    }
  })

  return (
    <Drawer
      title={
        editingEntry
          ? t('pprCalendar.entryDrawer.editTitle', { date: date?.format('DD.MM.YYYY') })
          : t('pprCalendar.entryDrawer.addTitle', { date: date?.format('DD.MM.YYYY') })
      }
      placement="right"
      width={560}
      open={open}
      onClose={handleClose}
      destroyOnHidden
      zIndex={1100}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>{t('common.cancel')}</Button>
          <Button type="primary" loading={isSaving} onClick={() => void onSubmit()}>
            {t('common.save')}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" onFinish={() => void onSubmit()}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('pprCalendar.entryDrawer.activeScope', { scope: scopeLabel })}
        />

        <Form.Item
          label={t('pprCalendar.fields.pprType')}
          validateStatus={errors.pprTypeId ? 'error' : undefined}
          help={errors.pprTypeId ? t('pprCalendar.validation.pprTypeRequired') : undefined}
          required
        >
          <Controller
            name="pprTypeId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                showSearch
                optionFilterProp="label"
                options={pprTypeOptions}
                placeholder={t('pprCalendar.fields.pprTypePlaceholder')}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('pprCalendar.fields.objects')}
          validateStatus={errors.objectIds ? 'error' : undefined}
          help={errors.objectIds ? t('pprCalendar.validation.objectsRequired') : undefined}
          required
        >
          <Controller
            name="objectIds"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                mode="multiple"
                showSearch
                optionFilterProp="label"
                options={objectOptions}
                placeholder={t('pprCalendar.fields.objectsPlaceholder')}
              />
            )}
          />
        </Form.Item>

        <Form.Item label={t('pprCalendar.fields.comment')}>
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={3} placeholder={t('pprCalendar.fields.commentPlaceholder')} />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
