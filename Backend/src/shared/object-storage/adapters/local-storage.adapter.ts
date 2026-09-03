import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { UPLOADS_DIR } from '../../../modules/files/lib/storage';
import { GUIDE_VIDEOS_DIR } from '../../../modules/guide-videos/lib/storage';
import {
  GUIDE_VIDEOS_PREFIX,
  OBJECTS_PREFIX,
} from '../storage-keys';
import type { ObjectByteRange, ObjectStorageAdapter, StoredObjectMeta } from '../types';

function resolveLocalPath(key: string): string {
  if (key.startsWith(`${GUIDE_VIDEOS_PREFIX}/`)) {
    const storageKey = key.slice(GUIDE_VIDEOS_PREFIX.length + 1);
    return path.join(GUIDE_VIDEOS_DIR, storageKey);
  }

  if (key.startsWith(`${OBJECTS_PREFIX}/`)) {
    const storageKey = key.slice(OBJECTS_PREFIX.length + 1);
    return path.join(UPLOADS_DIR, storageKey);
  }

  throw new Error(`INVALID_OBJECT_KEY:${key}`);
}

function ensureParentDirectory(filePath: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export class LocalStorageAdapter implements ObjectStorageAdapter {
  async putObject(key: string, body: Buffer, _contentType?: string): Promise<void> {
    const filePath = resolveLocalPath(key);
    ensureParentDirectory(filePath);
    writeFileSync(filePath, body);
  }

  async putObjectFromPath(key: string, filePath: string, _contentType?: string): Promise<void> {
    const destinationPath = resolveLocalPath(key);
    ensureParentDirectory(destinationPath);
    copyFileSync(filePath, destinationPath);
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const filePath = resolveLocalPath(key);

    if (!existsSync(filePath)) {
      throw new Error('NOT_FOUND');
    }

    return readFileSync(filePath);
  }

  async getObjectStream(key: string, range?: ObjectByteRange): Promise<Readable> {
    const filePath = resolveLocalPath(key);

    if (!existsSync(filePath)) {
      throw new Error('NOT_FOUND');
    }

    if (range) {
      return createReadStream(filePath, { start: range.start, end: range.end });
    }

    return createReadStream(filePath);
  }

  async getObjectMeta(key: string): Promise<StoredObjectMeta> {
    const filePath = resolveLocalPath(key);

    if (!existsSync(filePath)) {
      throw new Error('NOT_FOUND');
    }

    const stat = statSync(filePath);

    return {
      size: stat.size,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = resolveLocalPath(key);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    const sourcePath = resolveLocalPath(sourceKey);
    const destinationPath = resolveLocalPath(destinationKey);

    if (!existsSync(sourcePath)) {
      throw new Error('NOT_FOUND');
    }

    ensureParentDirectory(destinationPath);
    copyFileSync(sourcePath, destinationPath);
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(resolveLocalPath(key));
  }
}
