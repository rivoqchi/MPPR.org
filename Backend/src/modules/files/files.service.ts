import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode } from '../../common/constants/error-codes';
import { ObjectStorageService } from '../../shared/object-storage/object-storage.service';
import { objectStorageKey } from '../../shared/object-storage/storage-keys';
import {
  buildStorageKey,
  ensureUploadsDirectory,
  isSafeStorageKey,
  MAX_UPLOAD_BYTES,
} from './lib/storage';

export type UploadedFileMeta = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
};

@Injectable()
export class FilesService {
  constructor(private readonly objectStorage: ObjectStorageService) {
    ensureUploadsDirectory();
  }

  async saveUploadedFile(file: Express.Multer.File): Promise<UploadedFileMeta> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    const storageKey = buildStorageKey(file.originalname || 'file');
    const mimeType =
      file.mimetype && file.mimetype !== 'application/octet-stream'
        ? file.mimetype
        : guessMimeTypeFromName(file.originalname || '');

    await this.objectStorage.putObject(objectStorageKey(storageKey), file.buffer, mimeType);

    return {
      id: storageKey,
      name: file.originalname || storageKey,
      size: file.size,
      mimeType,
    };
  }

  async streamFile(storageKey: string, res: Response): Promise<void> {
    if (!isSafeStorageKey(storageKey)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const key = objectStorageKey(storageKey);
    const [meta, stream] = await Promise.all([
      this.objectStorage.getObjectMeta(key),
      this.objectStorage.getObjectStream(key),
    ]);

    res.setHeader('Content-Type', meta.contentType || guessMimeTypeFromName(storageKey));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(meta.size));

    stream.pipe(res);
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (!isSafeStorageKey(storageKey)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    await this.objectStorage.deleteObject(objectStorageKey(storageKey));
  }
}

function guessMimeTypeFromName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}
