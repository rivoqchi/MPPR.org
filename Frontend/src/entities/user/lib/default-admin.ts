import { SYSTEM_ADMIN_ROLE_ID } from '@/entities/role/lib/default-roles'
import { ADMIN_PASSWORD } from '@/entities/user/lib/generate-password'
import type { User } from '@/entities/user/model/types'

export const DEFAULT_ADMIN_ID = 'default-admin'

export const DEFAULT_ADMIN: User = {
  id: DEFAULT_ADMIN_ID,
  firstName: 'Admin',
  lastName: 'MPPR',
  birthDate: '1990-01-01',
  phone: '+998947932005',
  tabelNumber: '00001',
  position: 'Administrator',
  roleId: SYSTEM_ADMIN_ROLE_ID,
  structuralUnitId: '',
  isActive: true,
  password: ADMIN_PASSWORD,
  createdAt: '2024-01-01T00:00:00.000Z',
}
