import { zodResolver } from '@hookform/resolvers/zod'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { App, Avatar, Button, DatePicker, Drawer, Form, Input, Select, Space, Upload } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { User } from '@/entities/user/model/types'
import {
  getSectionSelectionValue,
  parseSectionSelection,
  SECTIONLESS_ACCESS_VALUE,
} from '@/entities/user/lib/section-access'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import {
  userDrawerFormSchema,
  type UserDrawerFormSchema,
} from '@/features/users/model/user-form-schema'
import {
  formatPhoneDisplay,
  formatPhoneInput,
  PHONE_PREFIX,
} from '@/features/users/lib/phone'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { compressAvatarToDataUrl } from '@/shared/lib/avatar'

interface UserDrawerProps {
  open: boolean
  editingUser?: User | null
  onClose: () => void
  onSaved: (userId: string) => void
}

const defaultValues: UserDrawerFormSchema = {
  firstName: '',
  lastName: '',
  birthDate: undefined as unknown as UserDrawerFormSchema['birthDate'],
  phone: PHONE_PREFIX,
  tabelNumber: '',
  position: '',
  roleId: undefined as unknown as UserDrawerFormSchema['roleId'],
  structuralUnitId: undefined as unknown as UserDrawerFormSchema['structuralUnitId'],
  structuralUnitSectionSelection: undefined,
  avatar: undefined,
}

export function UserDrawer({ open, editingUser, onClose, onSaved }: UserDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const [isSaving, setIsSaving] = useState(false)
  const addUser = useUsersStore((state) => state.addUser)
  const updateUser = useUsersStore((state) => state.updateUser)
  const roles = useRolesStore((state) => state.roles)
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const isStructuralUnitsHydrated = useStructuralUnitsStore((state) => state.isHydrated)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<UserDrawerFormSchema>({
    resolver: zodResolver(userDrawerFormSchema),
    defaultValues,
  })

  const avatar = watch('avatar')
  const structuralUnitId = watch('structuralUnitId')

  const selectedUnit = useMemo(
    () => structuralUnits.find((unit) => unit.id === structuralUnitId),
    [structuralUnitId, structuralUnits],
  )

  const unitSections = selectedUnit?.sections ?? []
  const hasUnitSections = unitSections.length > 0

  const sectionOptions = useMemo(
    () => [
      {
        value: SECTIONLESS_ACCESS_VALUE,
        label: t('users.sectionAssignment.sectionless'),
      },
      ...unitSections.map((section) => ({
        value: section.id,
        label: `${section.originalName} (${section.shortName})`,
      })),
    ],
    [t, unitSections],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingUser) {
      const unit = structuralUnits.find((item) => item.id === editingUser.structuralUnitId)
      const unitHasSections = (unit?.sections?.length ?? 0) > 0
      const sectionSelection =
        getSectionSelectionValue(editingUser) ??
        (unitHasSections ? SECTIONLESS_ACCESS_VALUE : undefined)

      reset({
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        birthDate: dayjs(editingUser.birthDate),
        phone: formatPhoneInput(editingUser.phone || PHONE_PREFIX),
        tabelNumber: editingUser.tabelNumber,
        position: editingUser.position,
        roleId: editingUser.roleId,
        structuralUnitId: editingUser.structuralUnitId,
        structuralUnitSectionSelection: sectionSelection,
        avatar: editingUser.avatar ?? undefined,
      })
      return
    }

    reset(defaultValues)
    // Re-run when units hydrate so section default can be applied after units load.
  }, [open, editingUser, reset, isStructuralUnitsHydrated]) // eslint-disable-line react-hooks/exhaustive-deps -- structuralUnits intentionally omitted to avoid mid-edit resets

  useEffect(() => {
    if (!open || editingUser) {
      return
    }

    setValue('structuralUnitSectionSelection', undefined)
    clearErrors('structuralUnitSectionSelection')
  }, [clearErrors, editingUser, open, setValue, structuralUnitId])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const onInvalid = (formErrors: FieldErrors<UserDrawerFormSchema>) => {
    const firstError = Object.values(formErrors).find(
      (error) => typeof error?.message === 'string' && error.message.length > 0,
    )
    const message =
      typeof firstError?.message === 'string' && firstError.message.startsWith('users.')
        ? t(firstError.message)
        : t('users.messages.validationFailed')

    notification.warning({ message })
  }

  const onSubmit = async (values: UserDrawerFormSchema) => {
    const unit = structuralUnits.find((item) => item.id === values.structuralUnitId)
    const sections = unit?.sections ?? []

    if (sections.length > 0 && !values.structuralUnitSectionSelection) {
      setError('structuralUnitSectionSelection', {
        type: 'manual',
        message: 'users.validation.sectionRequired',
      })
      notification.warning({
        message: t('users.validation.sectionRequired'),
      })
      return
    }

    const sectionAssignment =
      sections.length > 0
        ? parseSectionSelection(values.structuralUnitSectionSelection)
        : { withoutSectionAccess: true, structuralUnitSectionId: undefined }

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate.format('YYYY-MM-DD'),
      phone: formatPhoneInput(values.phone),
      tabelNumber: values.tabelNumber,
      position: values.position,
      roleId: values.roleId,
      structuralUnitId: values.structuralUnitId,
      withoutSectionAccess: sectionAssignment.withoutSectionAccess,
      structuralUnitSectionId: sectionAssignment.structuralUnitSectionId,
      avatar: values.avatar ?? undefined,
    }

    setIsSaving(true)

    try {
      const user = editingUser
        ? await updateUser(editingUser.id, payload)
        : await addUser(payload)

      if (!user) {
        notification.error({ message: t('users.messages.error') })
        return
      }

      reset(defaultValues)
      onSaved(user.id)
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'users.messages.error' })
    } finally {
      setIsSaving(false)
    }
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const handleAvatarUpload = async (file: File, onChange: (value: string) => void) => {
    try {
      const dataUrl = await compressAvatarToDataUrl(file)
      onChange(dataUrl)
    } catch {
      notification.error({
        message: t('users.messages.avatarError'),
      })
    }

    return false
  }

  return (
    <Drawer
      title={
        editingUser ? t('users.drawer.editTitle') : t('users.drawer.title')
      }
      open={open}
      onClose={handleClose}
      width={520}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            loading={isSaving}
            onClick={handleSubmit(onSubmit, onInvalid)}
          >
            {t('common.save')}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label={t('users.fields.avatar')}>
          <Space align="center" size="large">
            <Avatar src={avatar} size={80} icon={<UserOutlined />} />
            <Controller
              name="avatar"
              control={control}
              render={({ field }) => (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => handleAvatarUpload(file, field.onChange)}
                >
                  <Button icon={<UploadOutlined />}>{t('users.uploadAvatar')}</Button>
                </Upload>
              )}
            />
          </Space>
        </Form.Item>

        <Form.Item
          label={t('users.fields.firstName')}
          validateStatus={errors.firstName ? 'error' : undefined}
          help={getError(errors.firstName?.message)}
          required
        >
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('users.placeholders.firstName')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('users.fields.lastName')}
          validateStatus={errors.lastName ? 'error' : undefined}
          help={getError(errors.lastName?.message)}
          required
        >
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('users.placeholders.lastName')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('users.fields.birthDate')}
          validateStatus={errors.birthDate ? 'error' : undefined}
          help={getError(errors.birthDate?.message)}
          required
        >
          <Controller
            name="birthDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                value={field.value}
                onChange={field.onChange}
                placeholder={t('users.placeholders.birthDate')}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('users.fields.phone')}
          validateStatus={errors.phone ? 'error' : undefined}
          help={getError(errors.phone?.message)}
          required
        >
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                value={formatPhoneDisplay(field.value || PHONE_PREFIX)}
                onChange={(event) => field.onChange(formatPhoneInput(event.target.value))}
                placeholder={t('users.placeholders.phone')}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('users.fields.tabelNumber')}
          validateStatus={errors.tabelNumber ? 'error' : undefined}
          help={getError(errors.tabelNumber?.message)}
          required
        >
          <Controller
            name="tabelNumber"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value}
                maxLength={5}
                inputMode="numeric"
                placeholder={t('users.placeholders.tabelNumber')}
                onChange={(event) =>
                  field.onChange(event.target.value.replace(/\D/g, '').slice(0, 5))
                }
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('users.fields.position')}
          validateStatus={errors.position ? 'error' : undefined}
          help={getError(errors.position?.message)}
          required
        >
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('users.placeholders.position')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('users.fields.structuralUnit')}
          validateStatus={errors.structuralUnitId ? 'error' : undefined}
          help={getError(errors.structuralUnitId?.message)}
          required
        >
          <Controller
            name="structuralUnitId"
            control={control}
            render={({ field }) => (
              <Select
                showSearch
                optionFilterProp="label"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  setValue('structuralUnitSectionSelection', undefined)
                  clearErrors('structuralUnitSectionSelection')
                }}
                onBlur={field.onBlur}
                placeholder={t('users.placeholders.structuralUnit')}
                options={structuralUnits.map((unit) => ({
                  value: unit.id,
                  label: `${unit.originalName} (${unit.shortName})`,
                }))}
              />
            )}
          />
        </Form.Item>

        {hasUnitSections && (
          <Form.Item
            label={t('users.fields.section')}
            validateStatus={errors.structuralUnitSectionSelection ? 'error' : undefined}
            help={getError(errors.structuralUnitSectionSelection?.message)}
            required
          >
            <Controller
              name="structuralUnitSectionSelection"
              control={control}
              render={({ field }) => (
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('users.placeholders.section')}
                  options={sectionOptions}
                />
              )}
            />
          </Form.Item>
        )}

        <Form.Item
          label={t('users.fields.role')}
          validateStatus={errors.roleId ? 'error' : undefined}
          help={getError(errors.roleId?.message)}
          required
        >
          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={t('users.placeholders.role')}
                options={roles.map((role) => ({
                  value: role.id,
                  label: role.name,
                }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
