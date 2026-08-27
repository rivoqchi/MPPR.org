import { PrismaService } from '../../../shared/prisma/prisma.service';

export function sanitizeApplicationNumberCode(shortName: string): string {
  const cleaned = shortName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9А-ЯЁЎҚҒҲӨҮ]/gi, '')
    .slice(0, 12);

  return cleaned || 'APP';
}

export function normalizeManualApplicationNumber(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

export async function generateApplicationNumber(
  prisma: PrismaService,
  unitShortName: string,
  now = new Date(),
): Promise<string> {
  const code = sanitizeApplicationNumberCode(unitShortName);
  const year = now.getFullYear();
  const prefix = `${code}-${year}-`;

  const existing = await prisma.application.findMany({
    where: {
      applicationNumber: {
        startsWith: prefix,
      },
    },
    select: { applicationNumber: true },
  });

  let maxSeq = 0;

  for (const row of existing) {
    const raw = row.applicationNumber?.slice(prefix.length) ?? '';
    const seq = Number.parseInt(raw, 10);

    if (!Number.isNaN(seq)) {
      maxSeq = Math.max(maxSeq, seq);
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function buildApplicationNumberPreview(
  unitShortName: string,
  now = new Date(),
): string {
  const code = sanitizeApplicationNumberCode(unitShortName);
  const year = now.getFullYear();
  return `${code}-${year}-****`;
}
