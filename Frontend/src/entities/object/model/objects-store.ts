import { create } from 'zustand'
import {
  createObject as createObjectApi,
  deleteObject as deleteObjectApi,
  fetchObjects,
  updateObject as updateObjectApi,
} from '@/shared/api/objects-api'
import type { ObjectFormValues, RegisteredObject } from '@/entities/object/model/types'

interface ObjectsState {
  objects: RegisteredObject[]
  isHydrated: boolean
  setObjects: (objects: RegisteredObject[]) => void
  hydrate: () => Promise<void>
  addObject: (data: ObjectFormValues, createdByUserId: string) => Promise<RegisteredObject>
  updateObject: (id: string, data: ObjectFormValues) => Promise<RegisteredObject | null>
  deleteObject: (id: string) => Promise<boolean>
}

export const useObjectsStore = create<ObjectsState>()((set, get) => ({
  objects: [],
  isHydrated: false,
  setObjects: (objects) => set({ objects, isHydrated: true }),
  hydrate: async () => {
    const objects = await fetchObjects()
    set({ objects, isHydrated: true })
  },
  addObject: async (data, _createdByUserId) => {
    const object = await createObjectApi(data)
    set({ objects: [...get().objects, object] })
    return object
  },
  updateObject: async (id, data) => {
    const object = await updateObjectApi(id, data)
    set({
      objects: get().objects.map((item) => (item.id === id ? object : item)),
    })
    return object
  },
  deleteObject: async (id) => {
    await deleteObjectApi(id)
    set({ objects: get().objects.filter((item) => item.id !== id) })
    return true
  },
}))
