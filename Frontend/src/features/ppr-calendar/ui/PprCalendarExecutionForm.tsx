import { Button, Form, Input, Select, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { getIncompleteObjectIds } from '@/features/ppr-calendar/lib/calendar-entries'
import {
  pprExecutionFormSchema,
  type PprExecutionFormSchema,
} from '@/features/ppr-calendar/model/ppr-execution-form-schema'

interface PprCalendarExecutionFormProps {
  entry: PprCalendarEntry
  active: boolean
  isSaving: boolean
  onCancel: () => void
  onSave: (
    values: PprExecutionFormSchema,
    images: UploadFile[],
    files: UploadFile[],
  ) => Promise<void>
  showActions?: boolean
  formId?: string
}

export function PprCalendarExecutionForm({
  entry,
  active,
  isSaving,
  onCancel,
  onSave,
  showActions = true,
  formId = 'ppr-calendar-execution-form',
}: PprCalendarExecutionFormProps) {
  const { t } = useTranslation()
  const objects = useObjectsStore((state) => state.objects)
  const [imageList, setImageList] = useState<UploadFile[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const incompleteObjectIds = useMemo(() => getIncompleteObjectIds(entry), [entry])

  const objectOptions = useMemo(
    () =>
      incompleteObjectIds.map((objectId) => {
        const object = objects.find((item) => item.id === objectId)

        return {
          value: objectId,
          label: object?.shortName ?? objectId,
        }
      }),
    [incompleteObjectIds, objects],
  )

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PprExecutionFormSchema>({
    resolver: zodResolver(pprExecutionFormSchema),
    defaultValues: {
      objectIds: [],
      comment: '',
    },
  })

  const selectedObjectIds = watch('objectIds')

  useEffect(() => {
    if (!active) {
      return
    }

    reset({
      objectIds: [],
      comment: '',
    })
    setImageList([])
    setFileList([])
  }, [active, entry.id, reset])

  const onSubmit = handleSubmit(async (values) => {
    await onSave(values, imageList, fileList)
  })

  return (
    <Form id={formId} layout="vertical" onFinish={() => void onSubmit()}>
      <Form.Item
        label={t('pprCalendar.executionDrawer.objects')}
        validateStatus={errors.objectIds ? 'error' : undefined}
        help={errors.objectIds ? t('pprCalendar.executionDrawer.objectsRequired') : undefined}
        required
      >
        <Select
          mode="multiple"
          placeholder={t('pprCalendar.executionDrawer.objectsPlaceholder')}
          options={objectOptions}
          value={selectedObjectIds}
          onChange={(value) => setValue('objectIds', value, { shouldValidate: true })}
        />
      </Form.Item>

      <Form.Item label={t('pprCalendar.executionDrawer.images')}>
        <Upload
          multiple
          accept="image/*"
          listType="picture"
          beforeUpload={() => false}
          fileList={imageList}
          onChange={({ fileList: nextFileList }) => setImageList(nextFileList)}
        >
          <Button>{t('pprCalendar.executionDrawer.uploadImages')}</Button>
        </Upload>
      </Form.Item>

      <Form.Item label={t('pprCalendar.executionDrawer.files')}>
        <Upload
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          beforeUpload={() => false}
          fileList={fileList}
          onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
        >
          <Button>{t('pprCalendar.executionDrawer.uploadFiles')}</Button>
        </Upload>
      </Form.Item>

      <Form.Item label={t('pprCalendar.fields.comment')}>
        <Input.TextArea
          rows={4}
          value={watch('comment')}
          onChange={(event) => setValue('comment', event.target.value)}
          placeholder={t('pprCalendar.executionDrawer.commentPlaceholder')}
        />
      </Form.Item>

      {showActions ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="primary" loading={isSaving} htmlType="submit">
            {t('common.save')}
          </Button>
        </div>
      ) : null}
    </Form>
  )
}
