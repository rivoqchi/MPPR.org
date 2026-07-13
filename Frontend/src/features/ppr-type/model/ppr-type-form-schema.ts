import type { UploadFile } from 'antd/es/upload'
import { z } from 'zod'
import { PPR_SHORT_NAMES } from '@/entities/ppr-type/model/types'

const MAX_FILES = 100

export const pprTypeFormSchema = z.object({
  originalName: z
    .string()
    .trim()
    .min(2, 'pprType.validation.originalNameMin'),
  shortName: z.enum(PPR_SHORT_NAMES, {
    error: 'pprType.validation.shortNameRequired',
  }),
  description: z
    .string()
    .trim()
    .min(10, 'pprType.validation.descriptionMin'),
  files: z
    .array(z.custom<UploadFile>((value) => value !== null && typeof value === 'object'))
    .max(MAX_FILES, 'pprType.validation.filesMax'),
})

export type PprTypeFormSchema = z.infer<typeof pprTypeFormSchema>

export const PPR_TYPE_MAX_FILES = MAX_FILES
