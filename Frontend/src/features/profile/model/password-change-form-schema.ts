import { z } from 'zod'

export const passwordChangeFormSchema = z
  .object({
    newPassword: z.string().min(4, 'profile.password.validation.minLength'),
    confirmPassword: z.string().min(1, 'profile.password.validation.confirmRequired'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'profile.password.validation.mismatch',
    path: ['confirmPassword'],
  })

export type PasswordChangeFormSchema = z.infer<typeof passwordChangeFormSchema>
