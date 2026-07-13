import { UploadOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Drawer, Form, Input, Space, Upload } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { RegisteredObject } from '@/entities/object/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { useAuthStore } from '@/entities/user/model/auth-store'
import {
  toObjectDocuments,
  toUploadFiles,
} from '@/features/object/lib/document-utils'
import { DEFAULT_MAP_CENTER } from '@/features/object/lib/yandex-maps'
import {
  objectFormSchema,
  type ObjectFormSchema,
} from '@/features/object/model/object-form-schema'
import { YandexMapPicker } from '@/features/object/ui/YandexMapPicker'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

interface ObjectDrawerProps {
  open: boolean
  editingObject: RegisteredObject | null
  onClose: () => void
  onSaved: () => void
}

async function persistObject(
  values: ObjectFormSchema,
  editingObject: RegisteredObject | null,
  createdByUserId: string,
  addObject: ReturnType<typeof useObjectsStore.getState>['addObject'],
  updateObject: ReturnType<typeof useObjectsStore.getState>['updateObject'],
) {
  const payload = {
    originalName: values.originalName,
    shortName: values.shortName,
    location: values.location,
    documents: await toObjectDocuments(values.documents, editingObject?.documents ?? []),
  }

  if (editingObject) {
    const updated = await updateObject(editingObject.id, payload)

    if (!updated) {
      throw new Error('Object not found')
    }

    return updated
  }

  return addObject(payload, createdByUserId)
}

export function ObjectDrawer({ open, editingObject, onClose, onSaved }: ObjectDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const addObject = useObjectsStore((state) => state.addObject)
  const updateObject = useObjectsStore((state) => state.updateObject)
  const currentUser = useAuthStore((state) => state.currentUser)
  const [isSaving, setIsSaving] = useState(false)

  const defaultValues = useMemo<ObjectFormSchema>(
    () => ({
      originalName: '',
      shortName: '',
      location: {
        latitude: DEFAULT_MAP_CENTER.latitude,
        longitude: DEFAULT_MAP_CENTER.longitude,
        address: '',
      },
      documents: [],
    }),
    [],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ObjectFormSchema>({
    resolver: zodResolver(objectFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingObject) {
      reset({
        originalName: editingObject.originalName,
        shortName: editingObject.shortName,
        location: editingObject.location,
        documents: toUploadFiles(editingObject.documents),
      })
      return
    }

    reset(defaultValues)
  }, [open, editingObject, reset, defaultValues])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = async (values: ObjectFormSchema) => {
    setIsSaving(true)

    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      await persistObject(
        values,
        editingObject,
        currentUser.id,
        addObject,
        updateObject,
      )

      notification.success({
        message: t('object.messages.saved'),
      })

      reset(defaultValues)
      onSaved()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'object.messages.error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={
        editingObject ? t('object.drawer.editTitle') : t('object.drawer.createTitle')
      }
      open={open}
      onClose={handleClose}
      width={720}
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
          label={t('object.fields.originalName')}
          validateStatus={errors.originalName ? 'error' : undefined}
          help={getError(errors.originalName?.message)}
          required
        >
          <Controller
            name="originalName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('object.placeholders.originalName')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('object.fields.shortName')}
          validateStatus={errors.shortName ? 'error' : undefined}
          help={getError(errors.shortName?.message)}
          required
        >
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('object.placeholders.shortName')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('object.fields.location')}
          validateStatus={errors.location?.address ? 'error' : undefined}
          help={getError(errors.location?.address?.message)}
          required
        >
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <YandexMapPicker
                value={field.value}
                onChange={(location) => {
                  field.onChange(location)
                  field.onBlur()
                }}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('object.fields.documents')}
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
                <Button icon={<UploadOutlined />}>{t('object.upload')}</Button>
              </Upload>
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
