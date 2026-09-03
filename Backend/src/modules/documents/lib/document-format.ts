export type OnlyOfficeDocumentKind = 'word' | 'cell' | 'slide';

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/pdf': 'pdf',
};

export function resolveOnlyOfficeDocumentMeta(
  fileName: string,
  mimeType?: string | null,
): { documentType: OnlyOfficeDocumentKind; fileType: string } {
  const extensionFromName = fileName.split('.').pop()?.toLowerCase() ?? '';
  const extensionFromMime = mimeType
    ? EXTENSION_BY_MIME[mimeType.toLowerCase()] ?? ''
    : '';
  const extension = extensionFromName || extensionFromMime || 'docx';

  switch (extension) {
    case 'xls':
      return { documentType: 'cell', fileType: 'xls' };
    case 'xlsx':
    case 'ods':
    case 'csv':
      return {
        documentType: 'cell',
        fileType: extension === 'ods' ? 'ods' : extension === 'csv' ? 'csv' : 'xlsx',
      };
    case 'ppt':
      return { documentType: 'slide', fileType: 'ppt' };
    case 'pptx':
    case 'odp':
      return { documentType: 'slide', fileType: extension === 'odp' ? 'odp' : 'pptx' };
    case 'doc':
      return { documentType: 'word', fileType: 'doc' };
    case 'rtf':
      return { documentType: 'word', fileType: 'rtf' };
    case 'txt':
      return { documentType: 'word', fileType: 'txt' };
    case 'pdf':
      return { documentType: 'word', fileType: 'pdf' };
    case 'odt':
      return { documentType: 'word', fileType: 'odt' };
    default:
      return { documentType: 'word', fileType: 'docx' };
  }
}

export function isOnlyOfficeEditableFileName(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  return [
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'odt',
    'ods',
    'odp',
    'rtf',
    'txt',
    'csv',
    'pdf',
  ].includes(extension);
}

export function guessMimeTypeFromFileName(fileName: string): string {
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
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default:
      return 'application/octet-stream';
  }
}
