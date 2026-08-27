import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createReadStream, existsSync, unlinkSync, writeFileSync } from 'node:fs';
import type { Response } from 'express';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  buildStorageKey,
  ensureUploadsDirectory,
  getUploadFilePath,
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
  constructor() {
    ensureUploadsDirectory();
  }

  saveUploadedFile(file: Express.Multer.File): UploadedFileMeta {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    const storageKey = buildStorageKey(file.originalname || 'file');
    const filePath = getUploadFilePath(storageKey);

    writeFileSync(filePath, file.buffer);

    const mimeType =
      file.mimetype && file.mimetype !== 'application/octet-stream'
        ? file.mimetype
        : guessMimeTypeFromName(file.originalname || '');

    return {
      id: storageKey,
      name: file.originalname || storageKey,
      size: file.size,
      mimeType,
    };
  }

  streamFile(storageKey: string, res: Response): void {
    const filePath = resolveExistingFilePath(storageKey);
    const mimeType = guessMimeTypeFromName(storageKey);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-store');

    createReadStream(filePath).pipe(res);
  }

  deleteFile(storageKey: string): void {
    const filePath = resolveExistingFilePath(storageKey);
    unlinkSync(filePath);
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

function resolveExistingFilePath(storageKey: string): string {
    if (!isSafeStorageKey(storageKey)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const filePath = getUploadFilePath(storageKey);

    if (!existsSync(filePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return filePath;
}
