import { UploadOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Drawer, Form, Input, Select, Space, Upload } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import {
  toStructuralUnitDocuments,
  toUploadFiles,
} from '@/features/structural-unit/lib/document-utils'
import {
  buildHeadUserSelectOptions,
  filterHeadUserSelectOption,
  resolveStructuralUnitHeadUserId,
} from '@/features/structural-unit/lib/head-user-select'
import {
  structuralUnitFormSchema,
  type StructuralUnitFormSchema,
} from '@/features/structural-unit/model/structural-unit-form-schema'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

interface StructuralUnitDrawerProps {
  open: boolean
  editingStructuralUnit: StructuralUnit | null
  onClose: () => void
  onSaved: () => void
}

async function persistStructuralUnit(
  values: StructuralUnitFormSchema,
  editingStructuralUnit: StructuralUnit | null,
  createdByUserId: string,
  addStructuralUnit: ReturnType<typeof useStructuralUnitsStore.getState>['addStructuralUnit'],
  updateStructuralUnit: ReturnType<
    typeof useStructuralUnitsStore.getState
  >['updateStructuralUnit'],
) {
  const payload = {
    originalName: values.originalName,
    shortName: values.shortName,
    headUserId: values.headUserId,
    documents: await toStructuralUnitDocuments(
      values.documents,
      editingStructuralUnit?.documents ?? [],
    ),
  }

  if (editingStructuralUnit) {
    const updated = await updateStructuralUnit(editingStructuralUnit.id, payload)

    if (!updated) {
      throw new Error('Structural unit not found')
    }

    return updated
  }

  return addStructuralUnit(payload, createdByUserId)
}

export function StructuralUnitDrawer({
  open,
  editingStructuralUnit,
  onClose,
  onSaved,
}: StructuralUnitDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const addStructuralUnit = useStructuralUnitsStore((state) => state.addStructuralUnit)
  const updateStructuralUnit = useStructuralUnitsStore((state) => state.updateStructuralUnit)
  const currentUser = useAuthStore((state) => state.currentUser)
  const users = useUsersStore((state) => state.users)
  const [isSaving, setIsSaving] = useState(false)

  const headUserOptions = useMemo(() => buildHeadUserSelectOptions(users), [users])

  const defaultValues = useMemo<StructuralUnitFormSchema>(
    () => ({
      originalName: '',
      shortName: '',
      headUserId: '',
      documents: [],
    }),
    [],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StructuralUnitFormSchema>({
    resolver: zodResolver(structuralUnitFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingStructuralUnit) {
      reset({
        originalName: editingStructuralUnit.originalName,
        shortName: editingStructuralUnit.shortName,
        headUserId:
          resolveStructuralUnitHeadUserId(editingStructuralUnit, users) ?? '',
        documents: toUploadFiles(editingStructuralUnit.documents),
      })
      return
    }

    reset(defaultValues)
  }, [open, editingStructuralUnit, reset, defaultValues, users])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = async (values: StructuralUnitFormSchema) => {
    setIsSaving(true)

    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      await persistStructuralUnit(
        values,
        editingStructuralUnit,
        currentUser.id,
        addStructuralUnit,
        updateStructuralUnit,
      )

      notification.success({
        message: t('structuralUnit.messages.saved'),
      })

      reset(defaultValues)
      onSaved()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'structuralUnit.messages.error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={
        editingStructuralUnit
          ? t('structuralUnit.drawer.editTitle')
          : t('structuralUnit.drawer.createTitle')
      }
      open={open}
      onClose={handleClose}
      width={640}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>{t('common.cancel')}</Button>
          <Button type="primary" disabled={isSaving} onClick={handleSubmit(onSubmit)}>
            {t('common.save')}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item
          label={t('structuralUnit.fields.originalName')}
          validateStatus={errors.originalName ? 'error' : undefined}
          help={getError(errors.originalName?.message)}
          required
        >
          <Controller
            name="originalName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('structuralUnit.placeholders.originalName')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('structuralUnit.fields.shortName')}
          validateStatus={errors.shortName ? 'error' : undefined}
          help={getError(errors.shortName?.message)}
          required
        >
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('structuralUnit.placeholders.shortName')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('structuralUnit.fields.headUser')}
          validateStatus={errors.headUserId ? 'error' : undefined}
          help={getError(errors.headUserId?.message)}
          required
        >
          <Controller
            name="headUserId"
            control={control}
            render={({ field }) => (
              <Select
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  filterHeadUserSelectOption(
                    input,
                    headUserOptions.find((item) => item.value === option?.value),
                  )
                }
                value={field.value || undefined}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={t('structuralUnit.placeholders.headUser')}
                options={headUserOptions}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('structuralUnit.fields.documents')}
          validateStatus={errors.documents ? 'error' : undefined}
          help={getError(errors.documents?.message)}
        >
          <Controller
            name="documents"
            control={control}
            render={({ field }) => (
              <Upload
                multiple
                beforeUpload={() => false}
                fileList={field.value}
                onChange={({ fileList }) =>
                  field.onChange(
                    fileList.map((file) => ({
                      ...file,
                      status: 'done' as const,
                    })),
                  )
                }
              >
                <Button icon={<UploadOutlined />}>{t('structuralUnit.upload')}</Button>
              </Upload>
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
