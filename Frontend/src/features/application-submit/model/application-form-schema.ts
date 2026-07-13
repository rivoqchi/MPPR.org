import type { Dayjs } from 'dayjs'
import type { UploadFile } from 'antd/es/upload'
import { z } from 'zod'
import type { ApplicationType } from '@/entities/application/model/types'

export const applicationFormSchema = z
  .object({
    structuralUnitIds: z
      .array(z.string())
      .min(1, 'applicationSubmit.validation.structuralUnitsRequired'),
    type: z.enum(['execution', 'information']),
    deadline: z.custom<Dayjs | undefined>().optional(),
    images: z.array(
      z.custom<UploadFile>((value) => value !== null && typeof value === 'object'),
    ),
    files: z.array(
      z.custom<UploadFile>((value) => value !== null && typeof value === 'object'),
    ),
    comment: z.string().trim().min(3, 'applicationSubmit.validation.commentMin'),
  })
  .superRefine((values, context) => {
    if (values.type === 'execution' && !values.deadline) {
      context.addIssue({
        code: 'custom',
        path: ['deadline'],
        message: 'applicationSubmit.validation.deadlineRequired',
      })
    }
  })

export type ApplicationFormSchema = z.infer<typeof applicationFormSchema>

export const APPLICATION_TYPE_OPTIONS: ApplicationType[] = ['execution', 'information']
