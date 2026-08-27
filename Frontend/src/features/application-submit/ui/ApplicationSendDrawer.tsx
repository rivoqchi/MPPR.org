import { UploadOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Upload,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Application, ApplicationFormValues } from '@/entities/application/model/types'
import { useApplicationsStore } from '@/entities/application/model/applications-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useAuthStore } from '@/entities/user/model/auth-store'
import {
  toApplicationAttachments,
  toUploadFiles,
} from '@/features/application-submit/lib/attachment-utils'
import {
  applicationFormSchema,
  type ApplicationFormSchema,
} from '@/features/application-submit/model/application-form-schema'
import { isApplicationFinalized } from '@/features/application-submit/lib/application-status'
import { buildApplicationNumberPreview } from '@/features/application-submit/lib/application-number'
import { SpecialMessageModal } from '@/features/application-submit/ui/SpecialMessageModal'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

interface ApplicationSendDrawerProps {
  open: boolean
  editingApplication?: Application | null
  onClose: () => void
  onSaved: (applicationId: string) => void
}

const defaultValues: ApplicationFormSchema = {
  submissionMode: 'single',
  numberMode: 'auto',
  applicationNumber: '',
  structuralUnitIds: [],
  structuralUnitSectionId: undefined,
  type: 'information',
  deadline: undefined,
  images: [],
  files: [],
  comment: '',
}

function applicationToFormValues(
  application: Application,
  ownStructuralUnitId?: string | null,
): ApplicationFormSchema {
  return {
    submissionMode: application.submissionMode ?? 'combined',
    numberMode: application.applicationNumber ? 'manual' : 'auto',
    applicationNumber: application.applicationNumber ?? '',
    structuralUnitIds: application.structuralUnitIds.filter(
      (unitId) => unitId !== ownStructuralUnitId,
    ),
    structuralUnitSectionId: application.structuralUnitSectionId ?? undefined,
    type: application.type,
    deadline: application.deadline ? dayjs(application.deadline) : undefined,
    images: toUploadFiles(application.images),
    files: toUploadFiles(application.files),
    comment: application.comment,
  }
}

export function ApplicationSendDrawer({
  open,
  editingApplication,
  onClose,
  onSaved,
}: ApplicationSendDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const addApplication = useApplicationsStore((state) => state.addApplication)
  const updateApplication = useApplicationsStore((state) => state.updateApplication)
  const currentUser = useAuthStore((state) => state.currentUser)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const [specialMessageOpen, setSpecialMessageOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<ApplicationFormSchema | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormSchema>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
  })

  const applicationType = useWatch({ control, name: 'type' })
  const submissionMode = useWatch({ control, name: 'submissionMode' })
  const numberMode = useWatch({ control, name: 'numberMode' })
  const selectedUnitIds = useWatch({ control, name: 'structuralUnitIds' }) ?? []
  const selectedSectionId = useWatch({ control, name: 'structuralUnitSectionId' })

  useEffect(() => {
    if (applicationType === 'information') {
      setValue('deadline', undefined)
    }
  }, [applicationType, setValue])

  const ownStructuralUnitId = currentUser?.structuralUnitId
  const ownStructuralUnit = useMemo(
    () => structuralUnits.find((unit) => unit.id === ownStructuralUnitId),
    [ownStructuralUnitId, structuralUnits],
  )
  const autoNumberPreview = useMemo(
    () => buildApplicationNumberPreview(ownStructuralUnit?.shortName),
    [ownStructuralUnit?.shortName],
  )

  const numberModeOptions = useMemo(
    () => [
      { value: 'auto', label: t('applicationSubmit.numberModes.auto') },
      { value: 'manual', label: t('applicationSubmit.numberModes.manual') },
    ],
    [t],
  )

  const structuralUnitOptions = useMemo(
    () =>
      structuralUnits
        .filter((unit) => unit.id !== ownStructuralUnitId)
        .map((unit) => ({
          value: unit.id,
          label: unit.shortName,
        })),
    [ownStructuralUnitId, structuralUnits],
  )

  const selectedUnit = useMemo(() => {
    if (submissionMode !== 'single' || selectedUnitIds.length !== 1) {
      return undefined
    }

    return structuralUnits.find((unit) => unit.id === selectedUnitIds[0])
  }, [selectedUnitIds, structuralUnits, submissionMode])

  const sectionOptions = useMemo(
    () =>
      (selectedUnit?.sections ?? []).map((section) => ({
        value: section.id,
        label: section.shortName || section.originalName,
      })),
    [selectedUnit],
  )

  const showSectionSelect = submissionMode === 'single' && sectionOptions.length > 0

  useEffect(() => {
    if (!showSectionSelect && selectedSectionId) {
      setValue('structuralUnitSectionId', undefined)
    }
  }, [selectedSectionId, setValue, showSectionSelect])

  const typeOptions = useMemo(
    () => [
      { value: 'execution', label: t('applicationSubmit.types.execution') },
      { value: 'information', label: t('applicationSubmit.types.information') },
    ],
    [t],
  )

  const modeOptions = useMemo(
    () => [
      { value: 'single', label: t('applicationSubmit.submissionModes.single') },
      { value: 'combined', label: t('applicationSubmit.submissionModes.combined') },
    ],
    [t],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    reset(
      editingApplication
        ? applicationToFormValues(editingApplication, ownStructuralUnitId)
        : defaultValues,
    )
    setPendingValues(null)
    setSpecialMessageOpen(false)
  }, [open, editingApplication, ownStructuralUnitId, reset])

  const handleClose = () => {
    reset(defaultValues)
    setPendingValues(null)
    setSpecialMessageOpen(false)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const persistApplication = async (
    values: ApplicationFormSchema,
    specialMessages: ApplicationFormValues['specialMessages'],
  ) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const existingImages = editingApplication?.images ?? []
    const existingFiles = editingApplication?.files ?? []
    const images = await toApplicationAttachments(values.images, existingImages, 'image')
    const files = await toApplicationAttachments(values.files, existingFiles, 'file')

    const payload: ApplicationFormValues = {
      submissionMode: values.submissionMode,
      numberMode: values.numberMode,
      applicationNumber:
        values.numberMode === 'manual' ? values.applicationNumber?.trim() || null : null,
      structuralUnitIds: values.structuralUnitIds,
      structuralUnitSectionId:
        values.submissionMode === 'single' ? values.structuralUnitSectionId || null : null,
      type: values.type,
      deadline:
        values.type === 'execution' && values.deadline
          ? values.deadline.format('YYYY-MM-DD')
          : undefined,
      images,
      files,
      comment: values.comment,
      specialMessages,
    }

    if (editingApplication) {
      const application = await updateApplication(editingApplication.id, payload)

      if (!application) {
        throw new Error('Application not found')
      }

      return application
    }

    return addApplication(payload)
  }

  const validateTargeting = (values: ApplicationFormSchema): boolean => {
    if (
      ownStructuralUnitId &&
      values.structuralUnitIds.includes(ownStructuralUnitId)
    ) {
      notification.warning({
        message: t('applicationSubmit.validation.cannotTargetOwnStructuralUnit'),
      })
      return false
    }

    if (values.submissionMode === 'single') {
      if (values.structuralUnitIds.length !== 1) {
        notification.warning({
          message: t('applicationSubmit.validation.singleStructuralUnitRequired'),
        })
        return false
      }

      const unit = structuralUnits.find((item) => item.id === values.structuralUnitIds[0])

      if (unit && unit.sections.length > 0 && !values.structuralUnitSectionId) {
        notification.warning({
          message: t('applicationSubmit.validation.sectionRequired'),
        })
        return false
      }
    }

    return true
  }

  const onSubmit = (values: ApplicationFormSchema) => {
    if (!validateTargeting(values)) {
      return
    }

    if (editingApplication) {
      if (isApplicationFinalized(editingApplication)) {
        notification.warning({ message: t('applicationSubmit.messages.finalizedHint') })
        return
      }

      void handleSave(values, editingApplication.specialMessages, 'updated')
      return
    }

    setPendingValues(values)
    setSpecialMessageOpen(true)
  }

  const handleSave = async (
    values: ApplicationFormSchema,
    specialMessages: ApplicationFormValues['specialMessages'],
    successKey: 'saved' | 'updated',
  ) => {
    setIsSaving(true)

    try {
      const application = await persistApplication(values, specialMessages)
      notification.success({ message: t(`applicationSubmit.messages.${successKey}`) })
      handleClose()
      onSaved(application.id)
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'applicationSubmit.messages.error' })
    } finally {
      setIsSaving(false)
      setSpecialMessageOpen(false)
    }
  }

  const handleSkipSpecialMessage = async () => {
    if (!pendingValues) {
      return
    }

    await handleSave(pendingValues, [], 'saved')
  }

  const handleConfirmSpecialMessage = async (
    specialMessages: ApplicationFormValues['specialMessages'],
  ) => {
    if (!pendingValues) {
      return
    }

    await handleSave(pendingValues, specialMessages, 'saved')
  }

  const disablePastDate = (current: dayjs.Dayjs) =>
    current ? current.isBefore(dayjs().startOf('day')) : false

  return (
    <>
      <Drawer
        title={
          editingApplication
            ? t('applicationSubmit.drawer.editTitle')
            : t('applicationSubmit.drawer.title')
        }
        open={open}
        onClose={handleClose}
        width={680}
        destroyOnHidden
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="primary" disabled={isSaving} onClick={handleSubmit(onSubmit)}>
              {editingApplication ? t('common.save') : t('applicationSubmit.send')}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item
            label={t('applicationSubmit.fields.submissionMode')}
            validateStatus={errors.submissionMode ? 'error' : undefined}
            help={getError(errors.submissionMode?.message)}
            required
          >
            <Controller
              name="submissionMode"
              control={control}
              render={({ field }) => (
                <Radio.Group
                  {...field}
                  options={modeOptions}
                  onChange={(event) => {
                    field.onChange(event.target.value)
                    setValue('structuralUnitIds', [])
                    setValue('structuralUnitSectionId', undefined)
                  }}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('applicationSubmit.fields.applicationNumber')}
            required
            validateStatus={errors.applicationNumber || errors.numberMode ? 'error' : undefined}
            help={
              getError(errors.applicationNumber?.message) ||
              getError(errors.numberMode?.message) ||
              (numberMode === 'auto'
                ? t('applicationSubmit.hints.autoNumber', { preview: autoNumberPreview })
                : undefined)
            }
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Controller
                name="numberMode"
                control={control}
                render={({ field }) => (
                  <Radio.Group
                    {...field}
                    options={numberModeOptions}
                    onChange={(event) => {
                      field.onChange(event.target.value)
                      if (event.target.value === 'auto') {
                        setValue('applicationNumber', '')
                      }
                    }}
                  />
                )}
              />
              <Controller
                name="applicationNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={numberMode === 'auto' ? autoNumberPreview : field.value}
                    disabled={numberMode === 'auto'}
                    placeholder={t('applicationSubmit.placeholders.applicationNumber')}
                    maxLength={64}
                  />
                )}
              />
            </Space>
          </Form.Item>

          {submissionMode === 'single' ? (
            <Form.Item
              label={t('applicationSubmit.fields.structuralUnit')}
              required
              validateStatus={
                errors.structuralUnitIds || errors.structuralUnitSectionId ? 'error' : undefined
              }
              help={
                getError(errors.structuralUnitIds?.message) ||
                getError(errors.structuralUnitSectionId?.message)
              }
            >
              <Space.Compact style={{ width: '100%' }}>
                <Controller
                  name="structuralUnitIds"
                  control={control}
                  render={({ field }) => (
                    <Select
                      showSearch
                      optionFilterProp="label"
                      style={{ width: showSectionSelect ? '50%' : '100%' }}
                      value={field.value[0]}
                      onChange={(unitId?: string) => {
                        field.onChange(unitId ? [unitId] : [])
                        setValue('structuralUnitSectionId', undefined)
                      }}
                      allowClear
                      placeholder={t('applicationSubmit.placeholders.structuralUnit')}
                      options={structuralUnitOptions}
                    />
                  )}
                />

                {showSectionSelect ? (
                  <Controller
                    name="structuralUnitSectionId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        showSearch
                        optionFilterProp="label"
                        style={{ width: '50%' }}
                        value={field.value}
                        onChange={field.onChange}
                        allowClear
                        placeholder={t('applicationSubmit.placeholders.section')}
                        options={sectionOptions}
                      />
                    )}
                  />
                ) : null}
              </Space.Compact>
            </Form.Item>
          ) : (
            <Form.Item
              label={t('applicationSubmit.fields.structuralUnits')}
              validateStatus={errors.structuralUnitIds ? 'error' : undefined}
              help={getError(errors.structuralUnitIds?.message)}
              required
            >
              <Controller
                name="structuralUnitIds"
                control={control}
                render={({ field }) => (
                  <Select
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t('applicationSubmit.placeholders.structuralUnits')}
                    options={structuralUnitOptions}
                  />
                )}
              />
            </Form.Item>
          )}

          <Form.Item
            label={t('applicationSubmit.fields.type')}
            validateStatus={errors.type ? 'error' : undefined}
            help={getError(errors.type?.message)}
            required
          >
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={typeOptions}
                  placeholder={t('applicationSubmit.placeholders.type')}
                />
              )}
            />
          </Form.Item>

          {applicationType === 'execution' && (
            <Form.Item
              label={t('applicationSubmit.fields.deadline')}
              validateStatus={errors.deadline ? 'error' : undefined}
              help={getError(errors.deadline?.message)}
              required
            >
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD.MM.YYYY"
                    value={field.value}
                    onChange={field.onChange}
                    disabledDate={disablePastDate}
                    placeholder={t('applicationSubmit.placeholders.deadline')}
                  />
                )}
              />
            </Form.Item>
          )}

          <Form.Item label={t('applicationSubmit.fields.images')}>
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <Upload
                  multiple
                  accept="image/*"
                  listType="picture"
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
                  <Button icon={<UploadOutlined />}>{t('applicationSubmit.uploadImages')}</Button>
                </Upload>
              )}
            />
          </Form.Item>

          <Form.Item label={t('applicationSubmit.fields.files')}>
            <Controller
              name="files"
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
                  <Button icon={<UploadOutlined />}>{t('applicationSubmit.uploadFiles')}</Button>
                </Upload>
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('applicationSubmit.fields.comment')}
            validateStatus={errors.comment ? 'error' : undefined}
            help={getError(errors.comment?.message)}
            required
          >
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={4}
                  placeholder={t('applicationSubmit.placeholders.comment')}
                />
              )}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <SpecialMessageModal
        open={specialMessageOpen}
        structuralUnitIds={pendingValues?.structuralUnitIds ?? []}
        onCancel={() => setSpecialMessageOpen(false)}
        onSkip={() => void handleSkipSpecialMessage()}
        onConfirm={(messages) => void handleConfirmSpecialMessage(messages)}
      />
    </>
  )
}
