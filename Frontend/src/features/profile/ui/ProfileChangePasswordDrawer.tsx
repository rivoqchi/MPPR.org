import { zodResolver } from '@hookform/resolvers/zod'
import { LockOutlined } from '@ant-design/icons'
import { App, Button, Drawer, Form, Input, Popconfirm, Space } from 'antd'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { User } from '@/entities/user/model/types'
import {
  passwordChangeFormSchema,
  type PasswordChangeFormSchema,
} from '@/features/profile/model/password-change-form-schema'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useUsersStore } from '@/entities/user/model/users-store'

interface ProfileChangePasswordDrawerProps {
  open: boolean
  user: User
  onClose: () => void
  onSaved: () => void
}

const defaultValues: PasswordChangeFormSchema = {
  newPassword: '',
  confirmPassword: '',
}

export function ProfileChangePasswordDrawer({
  open,
  user,
  onClose,
  onSaved,
}: ProfileChangePasswordDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const changePassword = useUsersStore((state) => state.changePassword)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeFormSchema>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false)
      return
    }

    reset(defaultValues)
  }, [open, reset])

  const handleClose = () => {
    setConfirmOpen(false)
    reset(defaultValues)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = async (values: PasswordChangeFormSchema) => {
    setIsSaving(true)

    try {
      await changePassword(user.id, values.newPassword)

      notification.success({
        message: t('profile.password.saved'),
      })

      reset(defaultValues)
      setConfirmOpen(false)
      onSaved()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'profile.password.error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = handleSubmit(() => {
    setConfirmOpen(true)
  })

  return (
    <Drawer
      title={t('profile.password.drawerTitle')}
      open={open}
      onClose={handleClose}
      placement="top"
      height={320}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>{t('common.cancel')}</Button>
          <Popconfirm
            open={confirmOpen}
            title={t('profile.password.confirmTitle')}
            description={t('profile.password.confirmDescription')}
            okText={t('common.yes')}
            cancelText={t('common.no')}
            okButtonProps={{ loading: isSaving }}
            onConfirm={handleSubmit(onSubmit)}
            onCancel={() => setConfirmOpen(false)}
          >
            <Button type="primary" loading={isSaving} onClick={handleSaveClick}>
              {t('common.save')}
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Form layout="vertical" style={{ maxWidth: 480, margin: '0 auto' }}>
        <Form.Item
          label={t('profile.password.newPassword')}
          validateStatus={errors.newPassword ? 'error' : undefined}
          help={getError(errors.newPassword?.message)}
          required
        >
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder={t('profile.password.placeholders.newPassword')}
                autoComplete="new-password"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('profile.password.confirmPassword')}
          validateStatus={errors.confirmPassword ? 'error' : undefined}
          help={getError(errors.confirmPassword?.message)}
          required
        >
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder={t('profile.password.placeholders.confirmPassword')}
                autoComplete="new-password"
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
