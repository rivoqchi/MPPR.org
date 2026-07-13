export interface ObjectDocument {
  id: string
  name: string
  size: number
  mimeType: string
  dataUrl?: string
}

export interface ObjectLocation {
  latitude: number
  longitude: number
  address: string
}

export interface RegisteredObject {
  id: string
  originalName: string
  shortName: string
  location: ObjectLocation
  documents: ObjectDocument[]
  createdByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface ObjectFormValues {
  originalName: string
  shortName: string
  location: ObjectLocation
  documents: ObjectDocument[]
}
