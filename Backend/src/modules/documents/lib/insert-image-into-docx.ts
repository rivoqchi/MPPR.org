import { readFileSync, writeFileSync } from 'node:fs';
import JSZip from 'jszip';

const DOCX_PATHS = {
  contentTypes: '[Content_Types].xml',
  document: 'word/document.xml',
  documentRels: 'word/_rels/document.xml.rels',
} as const;

const MM_TO_EMU = 36000;

export type DocxQrPlacement = {
  pageIndex: number;
  offsetXMm: number;
  offsetYMm: number;
  sizeMm?: number;
};

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

function buildFloatingQrParagraph(
  relationshipId: string,
  sizeEmu: number,
  drawingId: number,
  offsetXEmu: number,
  offsetYEmu: number,
): string {
  const x = Math.max(0, Math.round(offsetXEmu));
  const y = Math.max(0, Math.round(offsetYEmu));
  const size = Math.max(1, Math.round(sizeEmu));

  // Complete Word floating picture (anchor). Incomplete drawings are ignored by Word/OO.
  return `<w:p>
  <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
  <w:r>
    <w:rPr/>
    <w:drawing>
      <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <wp:simplePos x="0" y="0"/>
        <wp:positionH relativeFrom="page">
          <wp:posOffset>${x}</wp:posOffset>
        </wp:positionH>
        <wp:positionV relativeFrom="page">
          <wp:posOffset>${y}</wp:posOffset>
        </wp:positionV>
        <wp:extent cx="${size}" cy="${size}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:wrapNone/>
        <wp:docPr id="${drawingId}" name="QRCode${drawingId}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="qr.png"/>
                <pic:cNvPicPr>
                  <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                </pic:cNvPicPr>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relationshipId}"/>
                <a:srcRect/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr bwMode="auto">
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${size}" cy="${size}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
                <a:ln><a:noFill/></a:ln>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:anchor>
    </w:drawing>
  </w:r>
</w:p>`;
}

function buildInlineQrParagraph(relationshipId: string, sizeEmu: number, drawingId: number): string {
  const size = Math.max(1, Math.round(sizeEmu));

  return `<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <wp:extent cx="${size}" cy="${size}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${drawingId}" name="QRCode${drawingId}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="qr.png"/>
                <pic:cNvPicPr>
                  <a:picLocks noChangeAspect="1"/>
                </pic:cNvPicPr>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relationshipId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${size}" cy="${size}"/>
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

function collectPageBreakOffsets(documentXml: string): number[] {
  const offsets: number[] = [];
  const pageBreakRegex =
    /<w:br\b[^>]*w:type="page"[^>]*\/>|<w:lastRenderedPageBreak\s*\/>/g;

  for (const match of documentXml.matchAll(pageBreakRegex)) {
    if (typeof match.index === 'number') {
      offsets.push(match.index + match[0].length);
    }
  }

  return offsets;
}

function insertParagraphForPage(
  documentXml: string,
  paragraphXml: string,
  pageIndex: number,
): string {
  const bodyOpenMatch = documentXml.match(/<w:body[^>]*>/);
  if (!bodyOpenMatch || typeof bodyOpenMatch.index !== 'number') {
    return documentXml.includes('</w:body>')
      ? documentXml.replace('</w:body>', `${paragraphXml}</w:body>`)
      : `${documentXml}${paragraphXml}`;
  }

  const bodyContentStart = bodyOpenMatch.index + bodyOpenMatch[0].length;
  const pageBreakOffsets = collectPageBreakOffsets(documentXml);

  // Always prefer start-of-page so floating coords apply to that page.
  // Never insert before final sectPr — that puts QR at document bottom if floating is ignored.
  if (pageIndex <= 0 || pageBreakOffsets.length === 0) {
    return (
      documentXml.slice(0, bodyContentStart) +
      paragraphXml +
      documentXml.slice(bodyContentStart)
    );
  }

  const breakIndex = Math.min(pageIndex - 1, pageBreakOffsets.length - 1);
  const insertAt = pageBreakOffsets[breakIndex] ?? bodyContentStart;

  return documentXml.slice(0, insertAt) + paragraphXml + documentXml.slice(insertAt);
}

async function readZipText(zip: JSZip, filePath: string): Promise<string | null> {
  const entry = zip.file(filePath);
  if (!entry) {
    return null;
  }

  return entry.async('string');
}

export async function insertPngIntoDocxBuffer(
  docxBuffer: Buffer,
  pngBufferOrPromise: Buffer | Promise<Buffer>,
  sizeMm = 28,
  placement?: DocxQrPlacement,
): Promise<Buffer> {
  const [zip, pngBuffer] = await Promise.all([
    JSZip.loadAsync(docxBuffer),
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
  const imageFileName = `qr-${mediaFiles.length + 1}.png`;
  const imagePath = `word/media/${imageFileName}`;
  const relationshipId = nextRelationshipId(relsXml);
  const resolvedSizeMm = placement?.sizeMm ?? sizeMm;
  const sizeEmu = Math.round(resolvedSizeMm * MM_TO_EMU);
  const drawingId = (Date.now() % 90_000) + 1;

  zip.file(imagePath, pngBuffer);

  const updatedRels = relsXml.includes('</Relationships>')
    ? relsXml.replace(
        '</Relationships>',
        `  <Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>\n</Relationships>`,
      )
    : `${relsXml}<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>`;

  const paragraphXml =
    placement != null
      ? buildFloatingQrParagraph(
          relationshipId,
          sizeEmu,
          drawingId,
          placement.offsetXMm * MM_TO_EMU,
          placement.offsetYMm * MM_TO_EMU,
        )
      : buildInlineQrParagraph(relationshipId, sizeEmu, drawingId);

  const updatedDocument =
    placement != null
      ? insertParagraphForPage(documentXml, paragraphXml, placement.pageIndex)
      : documentXml.includes('<w:sectPr')
        ? documentXml.replace(/<w:sectPr/, `${paragraphXml}<w:sectPr`)
        : documentXml.includes('</w:body>')
          ? documentXml.replace('</w:body>', `${paragraphXml}</w:body>`)
          : `${documentXml}${paragraphXml}`;

  zip.file(DOCX_PATHS.documentRels, updatedRels);
  zip.file(DOCX_PATHS.document, updatedDocument);
  zip.file(DOCX_PATHS.contentTypes, ensurePngContentType(contentTypesXml));

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });
}

/** @deprecated Use insertPngIntoDocxBuffer for object storage flows */
export async function insertPngIntoDocx(
  filePath: string,
  pngBufferOrPromise: Buffer | Promise<Buffer>,
  sizeMm = 28,
): Promise<void> {
  const output = await insertPngIntoDocxBuffer(readFileSync(filePath), pngBufferOrPromise, sizeMm);
  writeFileSync(filePath, output);
}
