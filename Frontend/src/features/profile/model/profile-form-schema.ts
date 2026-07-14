import dayjs, { type Dayjs } from 'dayjs'
import { z } from 'zod'

export const profileFormSchema = z.object({
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
  position: z
    .string()
    .trim()
    .min(2, 'users.validation.positionMin'),
  avatar: z.string().nullish(),
})

export type ProfileFormSchema = z.infer<typeof profileFormSchema>
