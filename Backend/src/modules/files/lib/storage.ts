import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const STORAGE_KEY_PATTERN = /^[a-f0-9-]{36}(\.[a-z0-9]+)?$/i;

export function ensureUploadsDirectory() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function isSafeStorageKey(storageKey: string): boolean {
  return STORAGE_KEY_PATTERN.test(storageKey);
}

export function getUploadFilePath(storageKey: string): string {
  if (!isSafeStorageKey(storageKey)) {
    throw new Error('INVALID_STORAGE_KEY');
  }

  return path.join(UPLOADS_DIR, storageKey);
}

export function buildStorageKey(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const safeExtension = extension.startsWith('.')
    ? extension.slice(1)
    : extension || 'bin';

  return `${randomUUID()}.${safeExtension}`;
}
