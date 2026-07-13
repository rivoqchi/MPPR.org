export const PPR_SHORT_NAMES = ['PPR1', 'PPR2', 'PPR3', 'PPR4', 'PPR5', 'PPR6'] as const

export type PprShortName = (typeof PPR_SHORT_NAMES)[number]

export interface PprTypeFile {
  id: string
  name: string
  size: number
  mimeType: string
  dataUrl?: string
}

export type PprTypeScopeType = 'section' | 'structure'

export interface PprType {
  id: string
  originalName: string
  shortName: PprShortName
  description: string
  files: PprTypeFile[]
  structuralUnitId?: string
  scopeType?: PprTypeScopeType
  sectionId?: string
  createdByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface PprTypeFormValues {
  originalName: string
  shortName: PprShortName
  description: string
  files: PprTypeFile[]
}
