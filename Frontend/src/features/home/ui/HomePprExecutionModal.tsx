import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, Input, Modal, Select, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useObjectsStore } from '@/entities/object/model/objects-store'
import type { DashboardTodayPprTask } from '@/features/home/model/dashboard-types'
import {
  pprExecutionFormSchema,
  type PprExecutionFormSchema,
} from '@/features/ppr-calendar/model/ppr-execution-form-schema'
import { buildExecutionAttachments } from '@/features/ppr-calendar/ui/PprCalendarExecutionDrawer'

interface HomePprExecutionModalProps {
  open: boolean
  task: DashboardTodayPprTask | null
  isSaving: boolean
  onClose: () => void
  onSave: (
    values: PprExecutionFormSchema,
    images: UploadFile[],
    files: UploadFile[],
  ) => Promise<void>
}

export function HomePprExecutionModal({
  open,
  task,
  isSaving,
  onClose,
  onSave,
}: HomePprExecutionModalProps) {
  const { t } = useTranslation()
  const objects = useObjectsStore((state) => state.objects)
  const [imageList, setImageList] = useState<UploadFile[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const incompleteObjectIds = useMemo(
    () => task?.objectIds.filter((objectId) => !task.completedObjectIds.includes(objectId)) ?? [],
    [task],
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
  }, [open, reset, task?.entryId])

  const onSubmit = handleSubmit(async (values) => {
    await onSave(values, imageList, fileList)
  })

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('homePage.actions.markPprDone')}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={isSaving} onClick={() => void onSubmit()}>
          {t('common.save')}
        </Button>,
      ]}
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
    </Modal>
  )
}

export async function buildHomePprExecutionPayload(
  values: PprExecutionFormSchema,
  images: UploadFile[],
  files: UploadFile[],
) {
  const attachments = await buildExecutionAttachments(images, files)

  return {
    objectIds: values.objectIds,
    comment: values.comment,
    ...attachments,
  }
}
