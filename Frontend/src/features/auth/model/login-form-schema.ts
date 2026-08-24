import { z } from 'zod'
import { getPhoneDigits, PHONE_PREFIX } from '@/features/users/lib/phone'

export const loginFormSchema = z.object({
  phone: z
    .string()
    .refine((value) => getPhoneDigits(value).length === 9, {
      message: 'auth.validation.phoneFormat',
    })
    .transform((value) => `${PHONE_PREFIX}${getPhoneDigits(value)}`),
  password: z.string().min(1, { message: 'auth.validation.passwordRequired' }),
  rememberMe: z.boolean(),
})

export type LoginFormSchema = z.infer<typeof loginFormSchema>
