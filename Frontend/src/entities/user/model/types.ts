export interface User {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  tabelNumber: string
  position: string
  roleId: string
  structuralUnitId: string
  withoutSectionAccess?: boolean
  structuralUnitSectionId?: string
  avatar?: string
  isActive: boolean
  isOnline?: boolean
  password: string
  lastSeenAt?: string | null
  createdAt: string
}

export interface UserFormValues {
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  tabelNumber: string
  position: string
  roleId: string
  structuralUnitId: string
  withoutSectionAccess?: boolean
  structuralUnitSectionId?: string | null
  avatar?: string
}

export interface LegacyUser extends Omit<User, 'roleId' | 'structuralUnitId'> {
  roleId?: string
  structuralUnitId?: string
  role?: string
}
