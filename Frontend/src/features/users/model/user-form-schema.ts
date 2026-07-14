import dayjs, { type Dayjs } from 'dayjs'
import { z } from 'zod'

export const userDrawerFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'users.validation.firstNameMin'),
  lastName: z
    .string()
    .trim()
    .min(2, 'users.validation.lastNameMin'),
  birthDate: z.custom<Dayjs>((value) => {
    if (dayjs.isDayjs(value)) {
      return value.isValid()
    }

    if (
      value &&
      typeof value === 'object' &&
      typeof (value as { isValid?: unknown }).isValid === 'function' &&
      typeof (value as { format?: unknown }).format === 'function'
    ) {
      return Boolean((value as Dayjs).isValid())
    }

    return false
  }, 'users.validation.birthDateRequired'),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, 'users.validation.phoneFormat'),
  tabelNumber: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'users.validation.tabelNumberFormat'),
  position: z
    .string()
    .trim()
    .min(2, 'users.validation.positionMin'),
  roleId: z.string().min(1, 'users.validation.roleRequired'),
  structuralUnitId: z.string().min(1, 'users.validation.structuralUnitRequired'),
  structuralUnitSectionSelection: z.string().nullish(),
  avatar: z.string().nullish(),
})

export type UserDrawerFormSchema = z.infer<typeof userDrawerFormSchema>
