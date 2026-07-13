import { UploadOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Drawer, Form, Input, Space, Upload } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { StructuralUnitSection } from '@/entities/structural-unit/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import {
  toStructuralUnitDocuments,
  toUploadFiles,
} from '@/features/structural-unit/lib/document-utils'
import {
  structuralUnitSectionFormSchema,
  type StructuralUnitSectionFormSchema,
} from '@/features/structural-unit/model/structural-unit-section-form-schema'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

interface StructuralUnitSectionDrawerProps {
  open: boolean
  structuralUnitId?: string
  editingSection: StructuralUnitSection | null
  onClose: () => void
  onSaved: () => void
}

async function persistSection(
  structuralUnitId: string,
  values: StructuralUnitSectionFormSchema,
  editingSection: StructuralUnitSection | null,
  addSection: ReturnType<typeof useStructuralUnitsStore.getState>['addSection'],
  updateSection: ReturnType<typeof useStructuralUnitsStore.getState>['updateSection'],
) {
  const payload = {
    originalName: values.originalName,
    shortName: values.shortName,
    documents: await toStructuralUnitDocuments(
      values.documents,
      editingSection?.documents ?? [],
    ),
  }

  if (editingSection) {
    const updated = await updateSection(structuralUnitId, editingSection.id, payload)

    if (!updated) {
      throw new Error('Section not found')
    }

    return updated
  }

  const created = await addSection(structuralUnitId, payload)

  if (!created) {
    throw new Error('Structural unit not found')
  }

  return created
}

export function StructuralUnitSectionDrawer({
  open,
  structuralUnitId,
  editingSection,
  onClose,
  onSaved,
}: StructuralUnitSectionDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const addSection = useStructuralUnitsStore((state) => state.addSection)
  const updateSection = useStructuralUnitsStore((state) => state.updateSection)
  const [isSaving, setIsSaving] = useState(false)

  const defaultValues = useMemo<StructuralUnitSectionFormSchema>(
    () => ({
      originalName: '',
      shortName: '',
      documents: [],
    }),
    [],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StructuralUnitSectionFormSchema>({
    resolver: zodResolver(structuralUnitSectionFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingSection) {
      reset({
        originalName: editingSection.originalName,
        shortName: editingSection.shortName,
        documents: toUploadFiles(editingSection.documents),
      })
      return
    }

    reset(defaultValues)
  }, [open, editingSection, reset, defaultValues])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = async (values: StructuralUnitSectionFormSchema) => {
    if (!structuralUnitId) {
      return
    }

    setIsSaving(true)

    try {
      await persistSection(
        structuralUnitId,
        values,
        editingSection,
        addSection,
        updateSection,
      )

      notification.success({
        message: t('structuralUnit.section.messages.saved'),
      })

      reset(defaultValues)
      onSaved()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'structuralUnit.section.messages.error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={
        editingSection
          ? t('structuralUnit.section.drawer.editTitle')
          : t('structuralUnit.section.drawer.createTitle')
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
          label={t('structuralUnit.section.fields.originalName')}
          validateStatus={errors.originalName ? 'error' : undefined}
          help={getError(errors.originalName?.message)}
          required
        >
          <Controller
            name="originalName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder={t('structuralUnit.section.placeholders.originalName')}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('structuralUnit.section.fields.shortName')}
          validateStatus={errors.shortName ? 'error' : undefined}
          help={getError(errors.shortName?.message)}
          required
        >
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder={t('structuralUnit.section.placeholders.shortName')}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('structuralUnit.section.fields.documents')}
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
