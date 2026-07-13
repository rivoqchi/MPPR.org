import { zodResolver } from '@hookform/resolvers/zod'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { App, Avatar, Button, DatePicker, Drawer, Form, Input, Space, Upload } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { User } from '@/entities/user/model/types'
import { useRoleName } from '@/entities/role/lib/use-role-name'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { useUsersStore } from '@/entities/user/model/users-store'
import {
  profileFormSchema,
  type ProfileFormSchema,
} from '@/features/profile/model/profile-form-schema'
import { formatPhoneDisplay } from '@/features/users/lib/phone'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { compressAvatarToDataUrl } from '@/shared/lib/avatar'

interface ProfileEditDrawerProps {
  open: boolean
  user: User
  onClose: () => void
  onSaved: () => void
}

export function ProfileEditDrawer({ open, user, onClose, onSaved }: ProfileEditDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const updateCurrentUser = useAuthStore((state) => state.updateCurrentUser)
  const updateProfile = useUsersStore((state) => state.updateProfile)
  const roleName = useRoleName(user.roleId)
  const [isSaving, setIsSaving] = useState(false)

  const defaultValues = useMemo<ProfileFormSchema>(
    () => ({
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: dayjs(user.birthDate),
      position: user.position,
      avatar: user.avatar,
    }),
    [user],
  )

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormSchema>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  })

  const avatar = watch('avatar')

  useEffect(() => {
    if (!open) {
      return
    }

    reset(defaultValues)
  }, [open, defaultValues, reset])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
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

  const onSubmit = async (values: ProfileFormSchema) => {
    setIsSaving(true)

    try {
      const profileData = {
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate.format('YYYY-MM-DD'),
        position: values.position,
        avatar: values.avatar,
      }

      const updatedUser = await updateProfile(user.id, profileData)

      if (!updatedUser) {
        throw new Error('Profile update failed')
      }

      updateCurrentUser(updatedUser)

      notification.success({
        message: t('profile.messages.saved'),
      })

      onSaved()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'profile.messages.error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={t('profile.drawer.editTitle')}
      open={open}
      onClose={handleClose}
      width={520}
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

        <Form.Item label={t('users.fields.phone')}>
          <Input value={formatPhoneDisplay(user.phone)} disabled />
        </Form.Item>

        <Form.Item label={t('users.fields.role')}>
          <Input value={roleName} disabled />
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
      </Form>
    </Drawer>
  )
}
