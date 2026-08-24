import { create } from 'zustand'
import {
  createStructuralUnit as createStructuralUnitApi,
  deleteStructuralUnit as deleteStructuralUnitApi,
  fetchStructuralUnits,
  updateStructuralUnit as updateStructuralUnitApi,
} from '@/shared/api/structural-units-api'
import {
  createStructuralUnitSection,
  mergeStructuralUnitSections,
  normalizeStructuralUnitFromApi,
} from '@/entities/structural-unit/lib/normalize-structural-unit'
import type {
  StructuralUnit,
  StructuralUnitFormValues,
  StructuralUnitSection,
  StructuralUnitSectionFormValues,
} from '@/entities/structural-unit/model/types'

interface StructuralUnitsState {
  structuralUnits: StructuralUnit[]
  isHydrated: boolean
  setStructuralUnits: (structuralUnits: StructuralUnit[]) => void
  hydrate: () => Promise<void>
  addStructuralUnit: (
    data: StructuralUnitFormValues,
    createdByUserId: string,
  ) => Promise<StructuralUnit>
  updateStructuralUnit: (
    id: string,
    data: StructuralUnitFormValues,
  ) => Promise<StructuralUnit | null>
  removeStructuralUnit: (id: string) => Promise<boolean>
  addSection: (
    structuralUnitId: string,
    data: StructuralUnitSectionFormValues,
  ) => Promise<StructuralUnitSection | null>
  updateSection: (
    structuralUnitId: string,
    sectionId: string,
    data: StructuralUnitSectionFormValues,
  ) => Promise<StructuralUnitSection | null>
}

function replaceStructuralUnit(units: StructuralUnit[], updated: StructuralUnit): StructuralUnit[] {
  return units.map((item) => (item.id === updated.id ? updated : item))
}

export const useStructuralUnitsStore = create<StructuralUnitsState>()((set, get) => ({
  structuralUnits: [],
  isHydrated: false,
  setStructuralUnits: (structuralUnits) =>
    set({
      structuralUnits: structuralUnits.map((unit) => normalizeStructuralUnitFromApi(unit)),
      isHydrated: true,
    }),
  hydrate: async () => {
    const structuralUnits = await fetchStructuralUnits()
    set({
      structuralUnits: structuralUnits.map((unit) => normalizeStructuralUnitFromApi(unit)),
      isHydrated: true,
    })
  },
  addStructuralUnit: async (data, _createdByUserId) => {
    const structuralUnit = normalizeStructuralUnitFromApi(await createStructuralUnitApi(data))
    set({ structuralUnits: [...get().structuralUnits, structuralUnit] })
    return structuralUnit
  },
  updateStructuralUnit: async (id, data) => {
    const existing = get().structuralUnits.find((item) => item.id === id)

    if (!existing) {
      return null
    }

    const updated = normalizeStructuralUnitFromApi(
      await updateStructuralUnitApi(id, {
        ...data,
        sections: existing.sections ?? [],
      }),
    )

    set({
      structuralUnits: replaceStructuralUnit(get().structuralUnits, updated),
    })

    return updated
  },
  removeStructuralUnit: async (id) => {
    await deleteStructuralUnitApi(id)
    set({
      structuralUnits: get().structuralUnits.filter((item) => item.id !== id),
    })
    return true
  },
  addSection: async (structuralUnitId, data) => {
    const existing = get().structuralUnits.find((item) => item.id === structuralUnitId)

    if (!existing) {
      return null
    }

    const section = createStructuralUnitSection(data)
    const nextSections = [...(existing.sections ?? []), section]

    const updatedFromApi = normalizeStructuralUnitFromApi(
      await updateStructuralUnitApi(structuralUnitId, {
        sections: nextSections,
      }),
    )

    const mergedSections = mergeStructuralUnitSections(nextSections, updatedFromApi.sections ?? [])
    const updated: StructuralUnit = {
      ...updatedFromApi,
      sections: mergedSections,
    }

    set({
      structuralUnits: replaceStructuralUnit(get().structuralUnits, updated),
    })

    return mergedSections.find((item) => item.id === section.id) ?? section
  },
  updateSection: async (structuralUnitId, sectionId, data) => {
    const existing = get().structuralUnits.find((item) => item.id === structuralUnitId)

    if (!existing) {
      return null
    }

    const sections = existing.sections ?? []
    const sectionIndex = sections.findIndex((item) => item.id === sectionId)

    if (sectionIndex === -1) {
      return null
    }

    const now = new Date().toISOString()
    const updatedSection = createStructuralUnitSection({
      originalName: data.originalName,
      shortName: data.shortName,
      headUserId: data.headUserId,
      headFullName: data.headFullName,
      documents: data.documents,
    })

    const nextSections = [...sections]
    nextSections[sectionIndex] = {
      ...updatedSection,
      id: sections[sectionIndex].id,
      createdAt: sections[sectionIndex].createdAt,
      updatedAt: now,
    }

    const updatedFromApi = normalizeStructuralUnitFromApi(
      await updateStructuralUnitApi(structuralUnitId, {
        sections: nextSections,
      }),
    )

    const mergedSections = mergeStructuralUnitSections(nextSections, updatedFromApi.sections ?? [])
    const updated: StructuralUnit = {
      ...updatedFromApi,
      sections: mergedSections,
    }

    set({
      structuralUnits: replaceStructuralUnit(get().structuralUnits, updated),
    })

    return mergedSections.find((item) => item.id === sectionId) ?? null
  },
}))
