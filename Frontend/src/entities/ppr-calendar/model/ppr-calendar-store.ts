import { create } from 'zustand'
import type {
  CreatePprCalendarEntryPayload,
  ExecutePprCalendarEntryPayload,
  PprCalendarEntryFormValues,
  PprCalendarMonth,
  PprCalendarMonthQuery,
} from '@/entities/ppr-calendar/model/types'
import {
  approvePprCalendarMonth,
  createPprCalendarEntry,
  deletePprCalendarEntry,
  fetchPendingPprCalendarMonths,
  fetchPprCalendarMonth,
  rejectPprCalendarMonth,
  clearPprCalendarMonth,
  executePprCalendarEntry,
  submitPprCalendarMonth,
  updatePprCalendarEntry,
} from '@/shared/api/ppr-calendar-api'

interface PprCalendarState {
  activeMonth: PprCalendarMonth | null
  pendingMonths: PprCalendarMonth[]
  isLoadingMonth: boolean
  isLoadingPending: boolean
  loadMonth: (query: PprCalendarMonthQuery) => Promise<PprCalendarMonth>
  loadPendingMonths: (structuralUnitId?: string) => Promise<PprCalendarMonth[]>
  upsertMonth: (month: PprCalendarMonth) => void
  createEntry: (payload: CreatePprCalendarEntryPayload) => Promise<PprCalendarMonth>
  updateEntry: (
    id: string,
    payload: Partial<PprCalendarEntryFormValues & { entrySectionId?: string }>,
  ) => Promise<void>
  removeEntry: (id: string) => Promise<void>
  submitMonth: (id: string) => Promise<PprCalendarMonth>
  approveMonth: (id: string) => Promise<PprCalendarMonth>
  rejectMonth: (id: string) => Promise<PprCalendarMonth>
  clearMonth: (id: string) => Promise<PprCalendarMonth>
  executeEntry: (entryId: string, payload: ExecutePprCalendarEntryPayload) => Promise<PprCalendarMonth>
}

export const usePprCalendarStore = create<PprCalendarState>()((set, get) => ({
  activeMonth: null,
  pendingMonths: [],
  isLoadingMonth: false,
  isLoadingPending: false,
  loadMonth: async (query) => {
    set({ isLoadingMonth: true })

    try {
      const month = await fetchPprCalendarMonth(query)
      set({ activeMonth: month })
      return month
    } catch {
      set({ activeMonth: null })
      throw new Error('PPR_CALENDAR_LOAD_FAILED')
    } finally {
      set({ isLoadingMonth: false })
    }
  },
  loadPendingMonths: async (structuralUnitId) => {
    set({ isLoadingPending: true })

    try {
      const pendingMonths = await fetchPendingPprCalendarMonths(structuralUnitId)
      set({ pendingMonths })
      return pendingMonths
    } catch {
      set({ pendingMonths: [] })
      return []
    } finally {
      set({ isLoadingPending: false })
    }
  },
  upsertMonth: (month) => {
    const { activeMonth, pendingMonths } = get()

    set({
      activeMonth:
        activeMonth &&
        activeMonth.structuralUnitId === month.structuralUnitId &&
        (activeMonth.sectionId || undefined) === (month.sectionId || undefined) &&
        activeMonth.year === month.year &&
        activeMonth.month === month.month
          ? month
          : activeMonth,
      pendingMonths:
        month.status === 'pending_approval'
          ? [
              month,
              ...pendingMonths.filter(
                (item) =>
                  !(
                    item.structuralUnitId === month.structuralUnitId &&
                    (item.sectionId ?? undefined) === (month.sectionId ?? undefined) &&
                    item.year === month.year &&
                    item.month === month.month
                  ),
              ),
            ]
          : pendingMonths.filter((item) => item.id !== month.id),
    })
  },
  createEntry: async (payload) => {
    const month = await createPprCalendarEntry(payload)
    set({ activeMonth: month })
    return month
  },
  updateEntry: async (id, payload) => {
    await updatePprCalendarEntry(id, payload)

    const { activeMonth } = get()

    if (!activeMonth) {
      return
    }

    const refreshed = await fetchPprCalendarMonth({
      structuralUnitId: activeMonth.structuralUnitId,
      sectionId: activeMonth.sectionId,
      year: activeMonth.year,
      month: activeMonth.month,
    })

    set({ activeMonth: refreshed })
  },
  removeEntry: async (id) => {
    await deletePprCalendarEntry(id)

    const { activeMonth } = get()

    if (!activeMonth) {
      return
    }

    const refreshed = await fetchPprCalendarMonth({
      structuralUnitId: activeMonth.structuralUnitId,
      sectionId: activeMonth.sectionId,
      year: activeMonth.year,
      month: activeMonth.month,
    })

    set({ activeMonth: refreshed })
  },
  submitMonth: async (id) => {
    const month = await submitPprCalendarMonth(id)
    get().upsertMonth(month)

    const { activeMonth } = get()

    if (activeMonth?.id === month.id) {
      set({ activeMonth: month })
    }

    return month
  },
  approveMonth: async (id) => {
    const month = await approvePprCalendarMonth(id)
    get().upsertMonth(month)

    const { activeMonth } = get()

    if (activeMonth?.id === month.id) {
      set({ activeMonth: month })
    }

    return month
  },
  rejectMonth: async (id) => {
    const month = await rejectPprCalendarMonth(id)
    get().upsertMonth(month)

    const { activeMonth } = get()

    if (activeMonth?.id === month.id) {
      set({ activeMonth: month })
    }

    return month
  },
  clearMonth: async (id) => {
    const month = await clearPprCalendarMonth(id)
    get().upsertMonth(month)

    const { activeMonth } = get()

    if (activeMonth?.id === month.id) {
      set({ activeMonth: month })
    }

    return month
  },
  executeEntry: async (entryId, payload) => {
    const month = await executePprCalendarEntry(entryId, payload)
    get().upsertMonth(month)

    const { activeMonth } = get()

    if (activeMonth?.id === month.id) {
      set({ activeMonth: month })
    }

    return month
  },
}))
