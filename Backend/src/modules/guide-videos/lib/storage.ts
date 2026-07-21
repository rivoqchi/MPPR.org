import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const GUIDE_VIDEOS_DIR = path.join(process.cwd(), 'uploads', 'guide-videos');
export const GUIDE_UPLOADS_TEMP_DIR = path.join(GUIDE_VIDEOS_DIR, 'tmp');
export const MAX_GUIDE_VIDEO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
export const ALLOWED_GUIDE_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/avi',
  'video/x-matroska',
  'video/mkv',
]);

export function ensureGuideVideoDirectories() {
  mkdirSync(GUIDE_VIDEOS_DIR, { recursive: true });
  mkdirSync(GUIDE_UPLOADS_TEMP_DIR, { recursive: true });
}

export function getGuideVideoFilePath(storageKey: string) {
  return path.join(GUIDE_VIDEOS_DIR, storageKey);
}

export function getGuideUploadTempPath(uploadId: string) {
  return path.join(GUIDE_UPLOADS_TEMP_DIR, `${uploadId}.part`);
}
