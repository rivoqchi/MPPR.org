import type { UploadFile } from 'antd/es/upload'
import { z } from 'zod'

const pagePermissionSchema = z.object({
  pageKey: z.string(),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
})

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, 'roles.validation.nameMin'),
  description: z.string().trim().min(2, 'roles.validation.descriptionMin'),
  documents: z.array(
    z.custom<UploadFile>((value) => value !== null && typeof value === 'object'),
  ),
  permissions: z.array(pagePermissionSchema),
  canViewAllStructuralUnits: z.boolean(),
})

export type RoleFormSchema = z.infer<typeof roleFormSchema>
