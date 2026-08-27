import type { Dayjs } from 'dayjs'
import type { UploadFile } from 'antd/es/upload'
import { z } from 'zod'
import type { ApplicationType } from '@/entities/application/model/types'

export const applicationFormSchema = z
  .object({
    numberMode: z.enum(['auto', 'manual']),
    applicationNumber: z.string().optional(),
    recipientUserIds: z.array(z.string()),
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
    if (values.recipientUserIds.length < 1) {
      context.addIssue({
        code: 'custom',
        path: ['recipientUserIds'],
        message: 'applicationSubmit.validation.recipientsRequired',
      })
    }

    if (values.numberMode === 'manual') {
      const number = values.applicationNumber?.trim() ?? ''

      if (number.length < 3) {
        context.addIssue({
          code: 'custom',
          path: ['applicationNumber'],
          message: 'applicationSubmit.validation.applicationNumberRequired',
        })
      }
    }

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
