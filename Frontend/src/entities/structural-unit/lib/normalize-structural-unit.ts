import type {
  StructuralUnit,
  StructuralUnitSection,
} from '@/entities/structural-unit/model/types'
import { normalizeStructuralUnitDocuments } from '@/features/structural-unit/lib/document-utils'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeStructuralUnitSection(
  value: unknown,
): StructuralUnitSection | null {
  if (!isRecord(value)) {
    return null
  }

  const originalName =
    typeof value.originalName === 'string' ? value.originalName.trim() : ''
  const shortName = typeof value.shortName === 'string' ? value.shortName.trim() : ''
  const id = typeof value.id === 'string' ? value.id.trim() : ''

  if (!id || !originalName || !shortName) {
    return null
  }

  const now = new Date().toISOString()
  const headUserId =
    typeof value.headUserId === 'string' && value.headUserId.trim()
      ? value.headUserId.trim()
      : undefined
  const headFullName =
    typeof value.headFullName === 'string' && value.headFullName.trim()
      ? value.headFullName.trim()
      : undefined

  return {
    id,
    originalName,
    shortName,
    ...(headUserId ? { headUserId } : {}),
    ...(headFullName ? { headFullName } : {}),
    documents: normalizeStructuralUnitDocuments(value.documents),
    createdAt: typeof value.createdAt === 'string' && value.createdAt ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' && value.updatedAt ? value.updatedAt : now,
  }
}

export function parseStructuralUnitSections(value: unknown): StructuralUnitSection[] {
  let raw = value

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }

  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((section) => normalizeStructuralUnitSection(section))
    .filter((section): section is StructuralUnitSection => section !== null)
}

export function normalizeStructuralUnitFromApi(unit: StructuralUnit): StructuralUnit {
  return {
    ...unit,
    documents: normalizeStructuralUnitDocuments(unit.documents),
    sections: parseStructuralUnitSections(unit.sections),
  }
}

export function mergeStructuralUnitSections(
  preferred: StructuralUnitSection[],
  received: StructuralUnitSection[],
): StructuralUnitSection[] {
  const receivedById = new Map(
    received
      .map((section) => normalizeStructuralUnitSection(section))
      .filter((section): section is StructuralUnitSection => section !== null)
      .map((section) => [section.id, section]),
  )

  return preferred
    .map((section) => receivedById.get(section.id) ?? section)
    .map((section) => normalizeStructuralUnitSection(section))
    .filter((section): section is StructuralUnitSection => section !== null)
}

export function createStructuralUnitSection(
  data: Pick<StructuralUnitSection, 'originalName' | 'shortName' | 'documents'> & {
    headUserId?: string
    headFullName?: string
  },
): StructuralUnitSection {
  const now = new Date().toISOString()
  const headUserId = data.headUserId?.trim() || undefined
  const headFullName = data.headFullName?.trim() || undefined

  return {
    id: crypto.randomUUID(),
    originalName: data.originalName.trim(),
    shortName: data.shortName.trim(),
    ...(headUserId ? { headUserId } : {}),
    ...(headFullName ? { headFullName } : {}),
    documents: normalizeStructuralUnitDocuments(data.documents),
    createdAt: now,
    updatedAt: now,
  }
}
