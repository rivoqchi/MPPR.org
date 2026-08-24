import type { UploadFile } from 'antd/es/upload'
import { z } from 'zod'

export const structuralUnitFormSchema = z.object({
  originalName: z
    .string()
    .trim()
    .min(2, 'structuralUnit.validation.originalNameMin'),
  shortName: z
    .string()
    .trim()
    .min(2, 'structuralUnit.validation.shortNameMin'),
  headUserId: z.string().trim().optional().default(''),
  documents: z.array(
    z.custom<UploadFile>((value) => value !== null && typeof value === 'object'),
  ),
})

export type StructuralUnitFormSchema = z.infer<typeof structuralUnitFormSchema>
