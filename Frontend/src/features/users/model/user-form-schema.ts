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
  birthDate: z.custom<Dayjs>(
    (value) => dayjs.isDayjs(value) && value.isValid(),
    'users.validation.birthDateRequired',
  ),
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
  structuralUnitSectionSelection: z.string().optional(),
  avatar: z.string().optional(),
})

export type UserDrawerFormSchema = z.infer<typeof userDrawerFormSchema>
