import { readFileSync, writeFileSync } from 'node:fs';
import JSZip from 'jszip';

const DOCX_PATHS = {
  contentTypes: '[Content_Types].xml',
  document: 'word/document.xml',
  documentRels: 'word/_rels/document.xml.rels',
} as const;

function nextRelationshipId(relsXml: string): string {
  const matches = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
  const maxId = matches.reduce((max, match) => Math.max(max, Number.parseInt(match[1] ?? '0', 10)), 0);
  return `rId${maxId + 1}`;
}

function ensurePngContentType(contentTypesXml: string): string {
  if (contentTypesXml.includes('Extension="png"')) {
    return contentTypesXml;
  }

  return contentTypesXml.replace(
    '</Types>',
    '  <Default Extension="png" ContentType="image/png"/>\n</Types>',
  );
}

function buildImageParagraph(relationshipId: string, sizeEmu: number, drawingId: number): string {
  return `<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:extent cx="${sizeEmu}" cy="${sizeEmu}"/>
        <wp:docPr id="${drawingId}" name="QR Code"/>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="qr.png"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relationshipId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${sizeEmu}" cy="${sizeEmu}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
}

async function readZipText(zip: JSZip, filePath: string): Promise<string | null> {
  const entry = zip.file(filePath);
  if (!entry) {
    return null;
  }

  return entry.async('string');
}

export async function insertPngIntoDocx(
  filePath: string,
  pngBufferOrPromise: Buffer | Promise<Buffer>,
  sizeMm = 28,
): Promise<void> {
  const [zip, pngBuffer] = await Promise.all([
    JSZip.loadAsync(readFileSync(filePath)),
    Promise.resolve(pngBufferOrPromise),
  ]);

  const [documentXml, relsXml, contentTypesXml] = await Promise.all([
    readZipText(zip, DOCX_PATHS.document),
    readZipText(zip, DOCX_PATHS.documentRels),
    readZipText(zip, DOCX_PATHS.contentTypes),
  ]);

  if (!documentXml || !relsXml || !contentTypesXml) {
    throw new Error('INVALID_DOCX');
  }

  const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/'));
  const imageName = `word/media/qr-${mediaFiles.length + 1}.png`;
  const relationshipId = nextRelationshipId(relsXml);
  const sizeEmu = Math.round(sizeMm * 36000);
  const drawingId = Date.now() % 100_000;

  zip.file(imageName, pngBuffer);

  const updatedRels = relsXml.replace(
    '</Relationships>',
    `  <Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName.split('/').pop()}"/>\n</Relationships>`,
  );

  const updatedDocument = documentXml.includes('</w:body>')
    ? documentXml.replace('</w:body>', `${buildImageParagraph(relationshipId, sizeEmu, drawingId)}</w:body>`)
    : `${documentXml}${buildImageParagraph(relationshipId, sizeEmu, drawingId)}`;

  zip.file(DOCX_PATHS.documentRels, updatedRels);
  zip.file(DOCX_PATHS.document, updatedDocument);
  zip.file(DOCX_PATHS.contentTypes, ensurePngContentType(contentTypesXml));

  const output = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });
  writeFileSync(filePath, output);
}
