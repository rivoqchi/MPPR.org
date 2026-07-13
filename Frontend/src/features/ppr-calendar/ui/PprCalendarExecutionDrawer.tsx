import { Button, Drawer, Form, Input, Select, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { PprCalendarEntry } from '@/entities/ppr-calendar/model/types'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import { toApplicationAttachments } from '@/features/application-submit/lib/attachment-utils'
import { getIncompleteObjectIds } from '@/features/ppr-calendar/lib/calendar-entries'
import {
  pprExecutionFormSchema,
  type PprExecutionFormSchema,
} from '@/features/ppr-calendar/model/ppr-execution-form-schema'

interface PprCalendarExecutionDrawerProps {
  open: boolean
  entry: PprCalendarEntry | null
  isSaving: boolean
  onClose: () => void
  onSave: (
    values: PprExecutionFormSchema,
    images: UploadFile[],
    files: UploadFile[],
  ) => Promise<void>
}

export function PprCalendarExecutionDrawer({
  open,
  entry,
  isSaving,
  onClose,
  onSave,
}: PprCalendarExecutionDrawerProps) {
  const { t } = useTranslation()
  const objects = useObjectsStore((state) => state.objects)
  const [imageList, setImageList] = useState<UploadFile[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const incompleteObjectIds = useMemo(
    () => (entry ? getIncompleteObjectIds(entry) : []),
    [entry],
  )

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
    if (!open) {
      return
    }

    reset({
      objectIds: [],
      comment: '',
    })
    setImageList([])
    setFileList([])
  }, [open, entry?.id, reset])

  const onSubmit = handleSubmit(async (values) => {
    await onSave(values, imageList, fileList)
  })

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={680}
      title={t('pprCalendar.executionDrawer.title')}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" loading={isSaving} onClick={() => void onSubmit()}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <Form layout="vertical" onFinish={() => void onSubmit()}>
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
      </Form>
    </Drawer>
  )
}

export async function buildExecutionAttachments(images: UploadFile[], files: UploadFile[]) {
  const imageAttachments = await toApplicationAttachments(images, [], 'image')
  const fileAttachments = await toApplicationAttachments(files, [], 'file')

  return {
    images: imageAttachments,
    files: fileAttachments,
  }
}
