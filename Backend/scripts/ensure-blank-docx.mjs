import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT_DIR, log } from './utils.mjs';

const TEMPLATE_DIR = path.join(ROOT_DIR, 'assets', 'templates');
const BLANK_DOCX_PATH = path.join(TEMPLATE_DIR, 'blank.docx');
const WORK_DIR = path.join(TEMPLATE_DIR, '.blank-docx-work');

export function ensureBlankDocxTemplate() {
  if (existsSync(BLANK_DOCX_PATH)) {
    return;
  }

  log('Creating missing blank.docx template...');

  mkdirSync(path.join(WORK_DIR, 'word', '_rels'), { recursive: true });
  mkdirSync(path.join(WORK_DIR, '_rels'), { recursive: true });

  writeFileSync(
    path.join(WORK_DIR, '[Content_Types].xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );

  writeFileSync(
    path.join(WORK_DIR, '_rels', '.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  writeFileSync(
    path.join(WORK_DIR, 'word', 'document.xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t></w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );

  writeFileSync(
    path.join(WORK_DIR, 'word', '_rels', 'document.xml.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );

  mkdirSync(TEMPLATE_DIR, { recursive: true });
  execSync(
    `zip -r "${BLANK_DOCX_PATH}" "[Content_Types].xml" _rels word`,
    { cwd: WORK_DIR, stdio: 'ignore' },
  );

  execSync(`rm -rf "${WORK_DIR}"`, { stdio: 'ignore' });
  log('blank.docx template created.');
}
