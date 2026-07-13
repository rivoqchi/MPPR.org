import { UploadOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Drawer, Form, Input, Select, Space, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd/es/upload'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { PprType } from '@/entities/ppr-type/model/types'
import { PPR_SHORT_NAMES } from '@/entities/ppr-type/model/types'
import { usePprTypesStore } from '@/entities/ppr-type/model/ppr-types-store'
import { useAuthStore } from '@/entities/user/model/auth-store'
import {
  PPR_TYPE_MAX_FILES,
  pprTypeFormSchema,
  type PprTypeFormSchema,
} from '@/features/ppr-type/model/ppr-type-form-schema'
import { toPprTypeFiles, toUploadFiles } from '@/features/ppr-type/lib/file-utils'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

const SAVE_MESSAGE_KEY = 'ppr-type-save'

const noopUploadRequest: NonNullable<UploadProps['customRequest']> = ({ onSuccess }) => {
  onSuccess?.('ok')
}

function normalizeUploadFileList(fileList: UploadFile[]) {
  return fileList
    .filter((file) => file.status !== 'error')
    .slice(0, PPR_TYPE_MAX_FILES)
    .map((file) => ({
      ...file,
      status: 'done' as const,
    }))
}

interface PprTypeDrawerProps {
  open: boolean
  editingPprType: PprType | null
  onClose: () => void
  onSaved: () => void
}

function toPprTypeFilesFromForm(
  values: PprTypeFormSchema,
  editingPprType: PprType | null,
) {
  return toPprTypeFiles(values.files, editingPprType?.files ?? [])
}

async function persistPprType(
  values: PprTypeFormSchema,
  editingPprType: PprType | null,
  createdByUserId: string,
  addPprType: ReturnType<typeof usePprTypesStore.getState>['addPprType'],
  updatePprType: ReturnType<typeof usePprTypesStore.getState>['updatePprType'],
) {
  const payload = {
    originalName: values.originalName,
    shortName: values.shortName,
    description: values.description,
    files: await toPprTypeFilesFromForm(values, editingPprType),
  }

  if (editingPprType) {
    const updated = await updatePprType(editingPprType.id, payload)

    if (!updated) {
      throw new Error('PPR type not found')
    }

    return updated
  }

  return addPprType(payload, createdByUserId)
}

export function PprTypeDrawer({ open, editingPprType, onClose, onSaved }: PprTypeDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const addPprType = usePprTypesStore((state) => state.addPprType)
  const updatePprType = usePprTypesStore((state) => state.updatePprType)
  const currentUser = useAuthStore((state) => state.currentUser)

  const defaultValues = useMemo<PprTypeFormSchema>(
    () => ({
      originalName: '',
      shortName: undefined as unknown as PprTypeFormSchema['shortName'],
      description: '',
      files: [],
    }),
    [],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PprTypeFormSchema>({
    resolver: zodResolver(pprTypeFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingPprType) {
      reset({
        originalName: editingPprType.originalName,
        shortName: editingPprType.shortName,
        description: editingPprType.description,
        files: toUploadFiles(editingPprType.files),
      })
      return
    }

    reset(defaultValues)
  }, [open, editingPprType, reset, defaultValues])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = async (values: PprTypeFormSchema) => {
    notification.open({
      key: SAVE_MESSAGE_KEY,
      message: t('pprType.messages.saving'),
      duration: 0,
    })

    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      await persistPprType(
        values,
        editingPprType,
        currentUser.id,
        addPprType,
        updatePprType,
      )

      notification.destroy(SAVE_MESSAGE_KEY)
      notification.success({
        key: SAVE_MESSAGE_KEY,
        message: t('pprType.messages.saved'),
      })

      reset(defaultValues)
      onSaved()
    } catch (error) {
      notification.destroy(SAVE_MESSAGE_KEY)
      notifyApiError(error, { fallbackKey: 'pprType.messages.error' })
    }
  }

  return (
    <>
      <Drawer
        title={
          editingPprType ? t('pprType.drawer.editTitle') : t('pprType.drawer.createTitle')
        }
        open={open}
        onClose={handleClose}
        width={640}
        destroyOnHidden
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleSubmit(onSubmit)}>
              {t('common.save')}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item
            label={t('pprType.fields.originalName')}
            validateStatus={errors.originalName ? 'error' : undefined}
            help={getError(errors.originalName?.message)}
            required
          >
            <Controller
              name="originalName"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder={t('pprType.placeholders.originalName')} />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('pprType.fields.shortName')}
            validateStatus={errors.shortName ? 'error' : undefined}
            help={getError(errors.shortName?.message)}
            required
          >
            <Controller
              name="shortName"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('pprType.placeholders.shortName')}
                  options={PPR_SHORT_NAMES.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('pprType.fields.description')}
            validateStatus={errors.description ? 'error' : undefined}
            help={getError(errors.description?.message)}
            required
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={5}
                  placeholder={t('pprType.placeholders.description')}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('pprType.fields.files')}
            validateStatus={errors.files ? 'error' : undefined}
            help={getError(errors.files?.message)}
          >
            <Controller
              name="files"
              control={control}
              render={({ field }) => (
                <Upload
                  multiple
                  customRequest={noopUploadRequest}
                  fileList={field.value}
                  onChange={({ fileList }) => field.onChange(normalizeUploadFileList(fileList))}
                >
                  <Button icon={<UploadOutlined />}>
                    {t('pprType.upload')}
                  </Button>
                </Upload>
              )}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
