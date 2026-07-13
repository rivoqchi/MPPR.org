import type { UploadFile } from 'antd/es/upload'
import { z } from 'zod'

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(5, 'object.validation.addressMin'),
})

export const objectFormSchema = z.object({
  originalName: z
    .string()
    .trim()
    .min(2, 'object.validation.originalNameMin'),
  shortName: z
    .string()
    .trim()
    .min(2, 'object.validation.shortNameMin'),
  location: locationSchema,
  documents: z.array(
    z.custom<UploadFile>((value) => value !== null && typeof value === 'object'),
  ),
})

export type ObjectFormSchema = z.infer<typeof objectFormSchema>
