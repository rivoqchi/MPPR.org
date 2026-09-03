import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  UnderlineType,
} from 'docx';

type ImageResolver = (storageKey: string) => Promise<Buffer | null>;

type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
};

function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, '')).trim();
}

function parseAlign(tag: string): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const match = tag.match(/text-align:\s*(left|center|right|justify)/i)
  if (!match) {
    return undefined
  }

  switch (match[1]) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return AlignmentType.LEFT
  }
}

function parseInlineRuns(html: string, style: InlineStyle = {}): TextRun[] {
  if (!html.trim()) {
    return []
  }

  const runs: TextRun[] = []
  const tokenRegex = /<(strong|b|em|i|u|s|strike|span)[^>]*>([\s\S]*?)<\/\1>|([^<]+)/gi
  let match: RegExpExecArray | null = tokenRegex.exec(html)

  while (match) {
    const tag = match[1]?.toLowerCase()
    const inner = match[2]
    const plain = match[3]

    if (tag && inner !== undefined) {
      const nextStyle: InlineStyle = { ...style }
      if (tag === 'strong' || tag === 'b') nextStyle.bold = true
      if (tag === 'em' || tag === 'i') nextStyle.italics = true
      if (tag === 'u') nextStyle.underline = true
      if (tag === 's' || tag === 'strike') nextStyle.strike = true
      runs.push(...parseInlineRuns(inner, nextStyle))
    } else if (plain) {
      const text = decodeHtml(plain)
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold: style.bold,
            italics: style.italics,
            underline: style.underline ? { type: UnderlineType.SINGLE } : undefined,
            strike: style.strike,
          }),
        )
      }
    }

    match = tokenRegex.exec(html)
  }

  if (runs.length === 0) {
    const fallback = stripTags(html)
    if (fallback) {
      runs.push(
        new TextRun({
          text: fallback,
          bold: style.bold,
          italics: style.italics,
          strike: style.strike,
          underline: style.underline ? { type: UnderlineType.SINGLE } : undefined,
        }),
      )
    }
  }

  return runs
}

function headingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (tag.startsWith('h1')) return HeadingLevel.HEADING_1
  if (tag.startsWith('h2')) return HeadingLevel.HEADING_2
  return HeadingLevel.HEADING_3
}

function parseImageTag(tag: string): {
  storageKey: string | null
  src: string | null
  width: number
  height: number
} {
  const storageKey = tag.match(/data-storage-key="([^"]+)"/i)?.[1] ?? null
  const src = tag.match(/src="([^"]+)"/i)?.[1] ?? null
  const width = Number.parseInt(tag.match(/width="(\d+)"/i)?.[1] ?? '280', 10)
  const height = Number.parseInt(tag.match(/height="(\d+)"/i)?.[1] ?? '0', 10)

  return {
    storageKey,
    src,
    width: Number.isFinite(width) ? width : 280,
    height: Number.isFinite(height) && height > 0 ? height : Math.round(width * 0.75),
  }
}

async function resolveImageBuffer(
  tag: string,
  resolveImage?: ImageResolver,
): Promise<Buffer | null> {
  const { storageKey, src } = parseImageTag(tag)

  if (storageKey && resolveImage) {
    const resolved = await resolveImage(storageKey)
    if (resolved) {
      return resolved
    }
  }

  if (src?.startsWith('data:image/')) {
    const base64 = src.split(',')[1]
    if (base64) {
      return Buffer.from(base64, 'base64')
    }
  }

  return null
}

function getImageType(buffer: Buffer): 'png' | 'jpg' | 'gif' | 'bmp' {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg'
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'gif'
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'bmp'
  return 'png'
}

function splitHtmlBlocks(html: string): string[] {
  const normalized = html.replace(/\r\n/g, '\n')
  const blocks: string[] = []
  const blockRegex =
    /<(?:p|h1|h2|h3|blockquote|ul|ol|li|div|hr|img)[^>]*>[\s\S]*?<\/(?:p|h1|h2|h3|blockquote|ul|ol|li|div)>|<hr[^>]*\/?>|<img[^>]*\/?>/gi

  let lastIndex = 0
  let match: RegExpExecArray | null = blockRegex.exec(normalized)

  while (match) {
    if (match.index > lastIndex) {
      const stray = normalized.slice(lastIndex, match.index).trim()
      if (stray) {
        blocks.push(stray)
      }
    }

    blocks.push(match[0])
    lastIndex = match.index + match[0].length
    match = blockRegex.exec(normalized)
  }

  if (lastIndex < normalized.length) {
    const tail = normalized.slice(lastIndex).trim()
    if (tail) {
      blocks.push(tail)
    }
  }

  return blocks.length > 0 ? blocks : [normalized]
}

export async function buildDocxBufferFromHtml(
  html: string,
  resolveImage?: ImageResolver,
): Promise<Buffer> {
  const children: Paragraph[] = []
  const blocks = splitHtmlBlocks(html)

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) {
      continue
    }

    if (/^<hr/i.test(trimmed)) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
      continue
    }

    if (/data-page-break/i.test(trimmed)) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
      continue
    }

    if (/^<img/i.test(trimmed)) {
      const imageBuffer = await resolveImageBuffer(trimmed, resolveImage)
      if (imageBuffer) {
        const { width, height } = parseImageTag(trimmed)
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                type: getImageType(imageBuffer),
                transformation: { width, height },
              }),
            ],
          }),
        )
      }
      continue
    }

    const headingMatch = trimmed.match(/^<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/i)
    if (headingMatch) {
      const runs = parseInlineRuns(headingMatch[2] ?? '')
      children.push(
        new Paragraph({
          heading: headingLevel(headingMatch[1]),
          children: runs.length > 0 ? runs : [new TextRun('')],
        }),
      )
      continue
    }

    const paragraphMatch = trimmed.match(/^<p[^>]*>([\s\S]*?)<\/p>/i)
    if (paragraphMatch) {
      const align = parseAlign(trimmed)
      const runs = parseInlineRuns(paragraphMatch[1] ?? '')
      children.push(
        new Paragraph({
          alignment: align,
          children: runs.length > 0 ? runs : [new TextRun('')],
        }),
      )
      continue
    }

    const blockquoteMatch = trimmed.match(/^<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)
    if (blockquoteMatch) {
      const innerText = stripTags(blockquoteMatch[1] ?? '')
      if (innerText) {
        children.push(
          new Paragraph({
            indent: { left: 720 },
            children: [new TextRun({ text: innerText, italics: true })],
          }),
        )
      }
      continue
    }

    const listItemMatches = [...trimmed.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    if (listItemMatches.length > 0) {
      for (const item of listItemMatches) {
        const runs = parseInlineRuns(item[1] ?? '')
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: runs.length > 0 ? runs : [new TextRun('')],
          }),
        )
      }
      continue
    }

    const plain = stripTags(trimmed)
    if (plain) {
      children.push(new Paragraph({ children: [new TextRun(plain)] }))
    }
  }

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun('')] }))
  }

  const document = new Document({
    sections: [{ children }],
  })

  return Packer.toBuffer(document)
}
