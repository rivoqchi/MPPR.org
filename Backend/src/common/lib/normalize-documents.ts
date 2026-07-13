import { StoredDocumentDto } from '../dto/stored-document.dto';

function isStoredDocument(value: unknown): value is StoredDocumentDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const document = value as Partial<StoredDocumentDto>;

  return (
    typeof document.id === 'string' &&
    document.id.trim().length > 0 &&
    typeof document.name === 'string' &&
    typeof document.mimeType === 'string' &&
    typeof document.size === 'number'
  );
}

export function normalizeDocuments(value: unknown): StoredDocumentDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isStoredDocument).map((document) => ({
    id: document.id.trim(),
    name: document.name,
    size: document.size,
    mimeType: document.mimeType,
    ...(document.dataUrl ? { dataUrl: document.dataUrl } : {}),
  }));
}
