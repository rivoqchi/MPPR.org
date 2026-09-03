export const OBJECTS_PREFIX = 'objects';
export const GUIDE_VIDEOS_PREFIX = 'guide-videos';

export function objectStorageKey(storageKey: string): string {
  return `${OBJECTS_PREFIX}/${storageKey}`;
}

export function guideVideoStorageKey(storageKey: string): string {
  return `${GUIDE_VIDEOS_PREFIX}/${storageKey}`;
}
