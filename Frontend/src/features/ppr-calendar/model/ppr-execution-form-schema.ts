import { z } from 'zod'

export const pprExecutionFormSchema = z.object({
  objectIds: z.array(z.string()).min(1),
  comment: z.string().optional(),
})

export type PprExecutionFormSchema = z.infer<typeof pprExecutionFormSchema>
