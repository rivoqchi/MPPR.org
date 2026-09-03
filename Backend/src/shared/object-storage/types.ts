import type { Readable } from 'node:stream';

export type ObjectByteRange = {
  start: number;
  end: number;
};

export type StoredObjectMeta = {
  size: number;
  contentType?: string;
};

export interface ObjectStorageAdapter {
  putObject(key: string, body: Buffer, contentType?: string): Promise<void>;
  putObjectFromPath(key: string, filePath: string, contentType?: string): Promise<void>;
  getObjectBuffer(key: string): Promise<Buffer>;
  getObjectStream(key: string, range?: ObjectByteRange): Promise<Readable>;
  getObjectMeta(key: string): Promise<StoredObjectMeta>;
  deleteObject(key: string): Promise<void>;
  copyObject(sourceKey: string, destinationKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
