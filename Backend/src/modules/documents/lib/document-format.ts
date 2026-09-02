export type OnlyOfficeDocumentKind = 'word' | 'cell' | 'slide';

export function resolveOnlyOfficeDocumentMeta(
  fileName: string,
): { documentType: OnlyOfficeDocumentKind; fileType: string } {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  switch (extension) {
    case 'xls':
      return { documentType: 'cell', fileType: 'xls' };
    case 'xlsx':
    case 'ods':
    case 'csv':
      return { documentType: 'cell', fileType: extension === 'ods' ? 'ods' : extension === 'csv' ? 'csv' : 'xlsx' };
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
