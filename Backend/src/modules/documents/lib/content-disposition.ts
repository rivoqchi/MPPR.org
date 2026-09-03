export function buildContentDispositionHeader(
  fileName: string,
  disposition: 'attachment' | 'inline' = 'attachment',
): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'document';
  const encoded = encodeURIComponent(fileName);

  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
