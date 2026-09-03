import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import { ErrorCode } from '../../common/constants/error-codes';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { R2StorageAdapter } from './adapters/r2-storage.adapter';
import type { ObjectByteRange, ObjectStorageAdapter } from './types';

@Injectable()
export class ObjectStorageService {
  private readonly adapter: ObjectStorageAdapter;

  constructor(private readonly configService: ConfigService) {
    const driver = this.configService.get<string>('STORAGE_DRIVER', 'local');

    if (driver === 'r2') {
      this.adapter = new R2StorageAdapter({
        accountId: this.configService.getOrThrow<string>('R2_ACCOUNT_ID'),
        accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
        bucketName: this.configService.getOrThrow<string>('R2_BUCKET_NAME'),
        endpoint: this.configService.get<string>('R2_ENDPOINT', ''),
      });
      return;
    }

    this.adapter = new LocalStorageAdapter();
  }

  putObject(key: string, body: Buffer, contentType?: string): Promise<void> {
    return this.adapter.putObject(key, body, contentType);
  }

  putObjectFromPath(key: string, filePath: string, contentType?: string): Promise<void> {
    return this.adapter.putObjectFromPath(key, filePath, contentType);
  }

  getObjectBuffer(key: string): Promise<Buffer> {
    return this.adapter.getObjectBuffer(key).catch(() => {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    });
  }

  getObjectStream(key: string, range?: ObjectByteRange): Promise<Readable> {
    return this.adapter.getObjectStream(key, range).catch(() => {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    });
  }

  getObjectMeta(key: string) {
    return this.adapter.getObjectMeta(key).catch(() => {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    });
  }

  deleteObject(key: string): Promise<void> {
    return this.adapter.deleteObject(key);
  }

  copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    return this.adapter.copyObject(sourceKey, destinationKey);
  }

  exists(key: string): Promise<boolean> {
    return this.adapter.exists(key);
  }
}
