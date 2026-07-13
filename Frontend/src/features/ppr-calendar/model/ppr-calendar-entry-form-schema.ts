import { z } from 'zod'

export const pprCalendarEntryFormSchema = z
  .object({
    pprTypeId: z.string().min(1),
    objectIds: z.array(z.string()).min(1),
    scopeType: z.enum(['section', 'structure']),
    entrySectionId: z.string().optional(),
    comment: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.scopeType === 'section' && !values.entrySectionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entrySectionId'],
        message: 'required',
      })
    }
  })

export type PprCalendarEntryFormSchema = z.infer<typeof pprCalendarEntryFormSchema>
