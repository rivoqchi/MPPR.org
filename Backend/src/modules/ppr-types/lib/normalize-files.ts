import { Prisma } from '@prisma/client';

interface StoredFileInput {
  id?: unknown;
  name?: unknown;
  size?: unknown;
  mimeType?: unknown;
  dataUrl?: unknown;
}

export function normalizePprTypeFiles(value: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const file = item as StoredFileInput;
      const id = typeof file.id === 'string' ? file.id.trim() : '';
      const name = typeof file.name === 'string' ? file.name.trim() : '';

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        size: Number(file.size ?? 0),
        mimeType:
          typeof file.mimeType === 'string' && file.mimeType
            ? file.mimeType
            : 'application/octet-stream',
      };
    })
    .filter((file): file is NonNullable<typeof file> => file !== null) as Prisma.InputJsonValue;
}
