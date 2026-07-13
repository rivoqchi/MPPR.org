import type { ProfileUpdateValues } from '@/entities/user/model/users-store'
import type { UserFormValues } from '@/entities/user/model/types'

export function toCreateUserPayload(data: UserFormValues, password: string) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
    phone: data.phone,
    tabelNumber: data.tabelNumber,
    position: data.position,
    roleId: data.roleId,
    structuralUnitId: data.structuralUnitId,
    withoutSectionAccess: data.withoutSectionAccess ?? false,
    structuralUnitSectionId: data.structuralUnitSectionId,
    avatar: data.avatar,
    password,
  }
}

export function toUpdateUserPayload(data: UserFormValues, password: string) {
  return toCreateUserPayload(data, password)
}

export function toUpdateProfilePayload(data: ProfileUpdateValues) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
    position: data.position,
    avatar: data.avatar,
  }
}

export function toChangePasswordPayload(password: string) {
  return { password }
}

export function toSetUserActivePayload(isActive: boolean) {
  return { isActive }
}
