import { Prisma } from '@prisma/client';

interface SectionInput {
  id?: unknown;
  originalName?: unknown;
  shortName?: unknown;
  documents?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function normalizeDocuments(value: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item) => {
      const document = item as Record<string, unknown>;

      return {
        id: String(document.id ?? ''),
        name: String(document.name ?? ''),
        size: Number(document.size ?? 0),
        mimeType: String(document.mimeType ?? 'application/octet-stream'),
        ...(typeof document.dataUrl === 'string' ? { dataUrl: document.dataUrl } : {}),
      };
    })
    .filter((document) => document.id && document.name) as Prisma.InputJsonValue;
}

export function normalizeStructuralUnitSections(value: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(value)) {
    return [];
  }

  const now = new Date().toISOString();

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const section = item as SectionInput;
      const originalName =
        typeof section.originalName === 'string' ? section.originalName.trim() : '';
      const shortName =
        typeof section.shortName === 'string' ? section.shortName.trim() : '';
      const id = typeof section.id === 'string' ? section.id.trim() : '';

      if (!id || !originalName || !shortName) {
        return null;
      }

      return {
        id,
        originalName,
        shortName,
        documents: normalizeDocuments(section.documents),
        createdAt:
          typeof section.createdAt === 'string' && section.createdAt
            ? section.createdAt
            : now,
        updatedAt:
          typeof section.updatedAt === 'string' && section.updatedAt
            ? section.updatedAt
            : now,
      };
    })
    .filter((section): section is NonNullable<typeof section> => section !== null) as Prisma.InputJsonValue;
}
