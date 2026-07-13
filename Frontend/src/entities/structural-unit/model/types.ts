export interface StructuralUnitDocument {
  id: string
  name: string
  size: number
  mimeType: string
  dataUrl?: string
}

export interface StructuralUnitSection {
  id: string
  originalName: string
  shortName: string
  documents: StructuralUnitDocument[]
  createdAt: string
  updatedAt: string
}

export interface StructuralUnit {
  id: string
  originalName: string
  shortName: string
  headFullName: string
  headUserId?: string
  documents: StructuralUnitDocument[]
  sections: StructuralUnitSection[]
  createdByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface StructuralUnitFormValues {
  originalName: string
  shortName: string
  headUserId: string
  documents: StructuralUnitDocument[]
}

export interface StructuralUnitPatchPayload extends Partial<StructuralUnitFormValues> {
  sections?: StructuralUnitSection[]
}

export interface StructuralUnitSectionFormValues {
  originalName: string
  shortName: string
  documents: StructuralUnitDocument[]
}
