import { UploadOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Drawer, Form, Input, Space, Switch, Upload } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { createEmptyPagePermissions, mergeRolePermissions } from '@/entities/role/lib/default-roles'
import type { Role } from '@/entities/role/model/types'
import { useRolesStore } from '@/entities/role/model/roles-store'
import { toStructuralUnitDocuments, toUploadFiles } from '@/features/structural-unit/lib/document-utils'
import { roleFormSchema, type RoleFormSchema } from '@/features/roles/model/role-form-schema'
import { RolePermissionsTable } from '@/features/roles/ui/RolePermissionsTable'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'

interface RoleDrawerProps {
  open: boolean
  editingRole: Role | null
  onClose: () => void
  onSaved: () => void
}

async function persistRole(
  values: RoleFormSchema,
  editingRole: Role | null,
  addRole: ReturnType<typeof useRolesStore.getState>['addRole'],
  updateRole: ReturnType<typeof useRolesStore.getState>['updateRole'],
) {
  const documents = await toStructuralUnitDocuments(
    values.documents,
    editingRole?.documents ?? [],
  )

  const payload = {
    name: values.name,
    description: values.description,
    documents,
    permissions: values.permissions,
    canViewAllStructuralUnits: values.canViewAllStructuralUnits,
  }

  if (editingRole) {
    const updated = await updateRole(editingRole.id, payload)

    if (!updated) {
      throw new Error('Role not found')
    }

    return updated
  }

  return addRole(payload)
}

export function RoleDrawer({ open, editingRole, onClose, onSaved }: RoleDrawerProps) {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const addRole = useRolesStore((state) => state.addRole)
  const updateRole = useRolesStore((state) => state.updateRole)
  const [isSaving, setIsSaving] = useState(false)

  const defaultValues = useMemo<RoleFormSchema>(
    () => ({
      name: '',
      description: '',
      documents: [],
      permissions: createEmptyPagePermissions(),
      canViewAllStructuralUnits: false,
    }),
    [],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormSchema>({
    resolver: zodResolver(roleFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingRole) {
      reset({
        name: editingRole.name,
        description: editingRole.description,
        documents: toUploadFiles(editingRole.documents),
        permissions: mergeRolePermissions(editingRole.permissions),
        canViewAllStructuralUnits: editingRole.canViewAllStructuralUnits ?? false,
      })
      return
    }

    reset(defaultValues)
  }, [open, editingRole, reset, defaultValues])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const getError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = async (values: RoleFormSchema) => {
    setIsSaving(true)

    try {
      await persistRole(values, editingRole, addRole, updateRole)

      notification.success({
        message: t('roles.messages.saved'),
      })

      reset(defaultValues)
      onSaved()
    } catch (error) {
      notifyApiError(error, { fallbackKey: 'roles.messages.error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={editingRole ? t('roles.drawer.editTitle') : t('roles.drawer.createTitle')}
      open={open}
      onClose={handleClose}
      width={920}
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
          label={t('roles.fields.name')}
          validateStatus={errors.name ? 'error' : undefined}
          help={getError(errors.name?.message)}
          required
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t('roles.placeholders.name')} />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('roles.fields.description')}
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
                rows={4}
                placeholder={t('roles.placeholders.description')}
              />
            )}
          />
        </Form.Item>

        <Form.Item label={t('roles.fields.documents')}>
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
                <Button icon={<UploadOutlined />}>{t('roles.upload')}</Button>
              </Upload>
            )}
          />
        </Form.Item>

        <Form.Item label={t('roles.fields.canViewAllStructuralUnits')}>
          <Controller
            name="canViewAllStructuralUnits"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                disabled={editingRole?.isSystem}
              />
            )}
          />
        </Form.Item>

        <Form.Item label={t('roles.fields.permissions')} required>
          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <RolePermissionsTable value={field.value} onChange={field.onChange} />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
