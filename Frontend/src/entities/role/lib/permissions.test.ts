import { describe, expect, it } from 'vitest'
import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'
import { createSystemAdminRole } from '@/entities/role/lib/default-roles'
import { canViewPage, hasPermission } from '@/entities/role/lib/permissions'

describe('role permissions', () => {
  it('grants full access to system admin role', () => {
    const role = createSystemAdminRole()

    expect(hasPermission(role, '/management/roles', 'delete')).toBe(true)
    expect(canViewPage(role, '/registration/objects')).toBe(true)
  })

  it('checks custom role permissions', () => {
    const role = {
      ...createSystemAdminRole(),
      id: 'custom-role',
      isSystem: false,
      permissions: [
        {
          pageKey: '/management/users',
          canView: true,
          canCreate: true,
          canEdit: false,
          canDelete: false,
        },
      ],
    }

    expect(canViewPage(role, '/management/users')).toBe(true)
    expect(hasPermission(role, '/management/users', 'create')).toBe(true)
    expect(hasPermission(role, '/management/users', 'edit')).toBe(false)
    expect(canViewPage(role, '/management/roles')).toBe(false)
  })

  it('uses admin role id constant', () => {
    expect(SYSTEM_ADMIN_ROLE_ID).toBe('system-admin-role')
  })
})
