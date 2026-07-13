import { EditOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Descriptions, Empty, Image, Space, Switch, Tag, theme } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useRoleName } from '@/entities/role/lib/use-role-name'
import { useStructuralUnitName } from '@/entities/structural-unit/lib/use-structural-unit-name'
import { getUserFullName, getUserInitials } from '@/entities/user/lib/user-display'
import type { User } from '@/entities/user/model/types'
import { useUserSectionAssignmentLabel } from '@/entities/user/lib/use-user-section-assignment-label'
import { formatPhoneDisplay } from '@/features/users/lib/phone'
import { splitPanelScrollStyle, splitPanelShellStyle, detailPanelScrollStyle, getDetailPanelCardStyle } from '@/shared/lib/page-layout'

interface UserDetailProps {
  user?: User
  onEdit?: () => void
  onChangePassword?: () => void
  onToggleActive?: (isActive: boolean) => void
  isActiveToggleLoading?: boolean
  canToggleActive?: boolean
}

export function UserDetail({
  user,
  onEdit,
  onChangePassword,
  onToggleActive,
  isActiveToggleLoading = false,
  canToggleActive = true,
}: UserDetailProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const roleName = useRoleName(user?.roleId)
  const structuralUnitName = useStructuralUnitName(user?.structuralUnitId)
  const sectionAssignmentLabel = useUserSectionAssignmentLabel(user)

  if (!user) {
    return (
      <div
        style={{
          ...splitPanelShellStyle,
          background: token.colorBgLayout,
        }}
      >
        <div
          style={{
            ...splitPanelScrollStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty description={t('users.selectUser')} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        ...splitPanelShellStyle,
        background: token.colorBgLayout,
      }}
    >
      <div style={detailPanelScrollStyle}>
      <div style={getDetailPanelCardStyle(token)}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1 }} />

          {(onEdit || onChangePassword) && (
            <Space>
              {onChangePassword && (
                <Button icon={<LockOutlined />} onClick={onChangePassword}>
                  {t('profile.changePassword')}
                </Button>
              )}
              {onEdit && (
                <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                  {t('users.edit')}
                </Button>
              )}
            </Space>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={getUserFullName(user)}
              width={160}
              height={160}
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                border: `4px solid ${token.colorBorderSecondary}`,
              }}
              preview={{
                mask: t('users.viewAvatar'),
              }}
            />
          ) : (
            <Avatar
              size={160}
              icon={<UserOutlined />}
              style={{
                fontSize: 48,
                border: `4px solid ${token.colorBorderSecondary}`,
              }}
            >
              {getUserInitials(user)}
            </Avatar>
          )}

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{getUserFullName(user)}</div>
            <Space style={{ marginTop: 8 }}>
              <Tag color="blue">{roleName}</Tag>
              {user.isActive === false && (
                <Tag color="default">{t('users.status.inactive')}</Tag>
              )}
            </Space>
          </div>
        </div>

        <Descriptions
          column={1}
          bordered
          style={{ marginTop: 32 }}
          items={[
            {
              key: 'firstName',
              label: t('users.fields.firstName'),
              children: user.firstName,
            },
            {
              key: 'lastName',
              label: t('users.fields.lastName'),
              children: user.lastName,
            },
            {
              key: 'birthDate',
              label: t('users.fields.birthDate'),
              children: dayjs(user.birthDate).format('DD.MM.YYYY'),
            },
            {
              key: 'phone',
              label: t('users.fields.phone'),
              children: formatPhoneDisplay(user.phone),
            },
            {
              key: 'tabelNumber',
              label: t('users.fields.tabelNumber'),
              children: user.tabelNumber,
            },
            {
              key: 'position',
              label: t('users.fields.position'),
              children: user.position,
            },
            {
              key: 'structuralUnit',
              label: t('users.fields.structuralUnit'),
              children: structuralUnitName,
            },
            ...(sectionAssignmentLabel
              ? [
                  {
                    key: 'section',
                    label: t('users.fields.section'),
                    children: sectionAssignmentLabel,
                  },
                ]
              : []),
            {
              key: 'role',
              label: t('users.fields.role'),
              children: roleName,
            },
            ...(onToggleActive
              ? [
                  {
                    key: 'isActive',
                    label: t('users.fields.isActive'),
                    children: (
                      <Switch
                        checked={user.isActive !== false}
                        loading={isActiveToggleLoading}
                        disabled={!canToggleActive}
                        checkedChildren={t('users.status.active')}
                        unCheckedChildren={t('users.status.inactive')}
                        onChange={onToggleActive}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
      </div>
    </div>
  )
}
