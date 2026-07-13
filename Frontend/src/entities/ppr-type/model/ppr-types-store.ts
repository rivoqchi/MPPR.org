import { create } from 'zustand'
import {
  createPprType as createPprTypeApi,
  fetchPprTypes,
  updatePprType as updatePprTypeApi,
} from '@/shared/api/ppr-types-api'
import { normalizePprTypeFiles } from '@/features/ppr-type/lib/file-utils'
import type { PprType, PprTypeFormValues } from '@/entities/ppr-type/model/types'

interface PprTypesState {
  pprTypes: PprType[]
  isHydrated: boolean
  setPprTypes: (pprTypes: PprType[]) => void
  hydrate: () => Promise<void>
  addPprType: (data: PprTypeFormValues, createdByUserId: string) => Promise<PprType>
  updatePprType: (id: string, data: PprTypeFormValues) => Promise<PprType | null>
}

function normalizePprType(pprType: PprType): PprType {
  return {
    ...pprType,
    files: normalizePprTypeFiles(pprType.files),
  }
}

export const usePprTypesStore = create<PprTypesState>()((set, get) => ({
  pprTypes: [],
  isHydrated: false,
  setPprTypes: (pprTypes) =>
    set({
      pprTypes: pprTypes.map((item) => normalizePprType(item)),
      isHydrated: true,
    }),
  hydrate: async () => {
    const pprTypes = await fetchPprTypes()
    set({
      pprTypes: pprTypes.map((item) => normalizePprType(item)),
      isHydrated: true,
    })
  },
  addPprType: async (data, _createdByUserId) => {
    const pprType = normalizePprType(await createPprTypeApi(data))
    set({ pprTypes: [...get().pprTypes, pprType] })
    return pprType
  },
  updatePprType: async (id, data) => {
    const pprType = normalizePprType(await updatePprTypeApi(id, data))
    set({
      pprTypes: get().pprTypes.map((item) => (item.id === id ? pprType : item)),
    })
    return pprType
  },
}))
