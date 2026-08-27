import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { resolveStructuralUnitHeadUserId } from '../../structural-units/lib/resolve-head-user';
import {
  normalizeRecipientUserIds,
  normalizeStructuralUnitIds,
} from './normalize-application';

export type ApplicationSubmissionMode = 'single' | 'combined';

export function normalizeSubmissionMode(value: unknown): ApplicationSubmissionMode {
  return value === 'single' ? 'single' : 'combined';
}

function normalizeSectionId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readSections(value: Prisma.JsonValue | null | undefined): Array<{
  id: string;
  headUserId?: string;
  headFullName?: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }

      const section = item as Record<string, unknown>;
      const id = typeof section.id === 'string' ? section.id.trim() : '';

      if (!id) {
        return null;
      }

      return {
        id,
        ...(typeof section.headUserId === 'string' && section.headUserId.trim()
          ? { headUserId: section.headUserId.trim() }
          : {}),
        ...(typeof section.headFullName === 'string'
          ? { headFullName: section.headFullName }
          : {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

async function resolveSectionHeadUserId(
  prisma: PrismaService,
  unitId: string,
  section: { headUserId?: string; headFullName?: string },
): Promise<string | null> {
  if (section.headUserId) {
    const linkedHead = await prisma.user.findUnique({
      where: { id: section.headUserId },
      select: { id: true },
    });

    if (linkedHead) {
      return linkedHead.id;
    }
  }

  const headFullName = section.headFullName?.trim().toLowerCase() ?? '';

  if (!headFullName) {
    return null;
  }

  const unitUsers = await prisma.user.findMany({
    where: { structuralUnitId: unitId },
    select: { id: true, firstName: true, lastName: true },
  });

  const match = unitUsers.find(
    (user) => `${user.firstName} ${user.lastName}`.trim().toLowerCase() === headFullName,
  );

  return match?.id ?? null;
}

export async function resolveApplicationIncomingRecipientUserIds(
  prisma: PrismaService,
  application: {
    recipientUserIds?: unknown;
    submissionMode?: string | null;
    structuralUnitIds: unknown;
    structuralUnitSectionId?: string | null;
  },
  excludeUserIds: string[] = [],
): Promise<string[]> {
  const excluded = new Set(excludeUserIds);
  const explicitRecipients = normalizeRecipientUserIds(application.recipientUserIds).filter(
    (userId) => !excluded.has(userId),
  );

  if (explicitRecipients.length > 0) {
    return explicitRecipients;
  }

  const unitIds = normalizeStructuralUnitIds(application.structuralUnitIds);
  const mode = normalizeSubmissionMode(application.submissionMode);
  const sectionId = normalizeSectionId(application.structuralUnitSectionId);

  if (unitIds.length === 0) {
    return [];
  }

  if (mode !== 'single') {
    const users = await prisma.user.findMany({
      where: {
        structuralUnitId: { in: unitIds },
        id: { notIn: excludeUserIds },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  const unitId = unitIds[0];
  const unit = await prisma.structuralUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      headUserId: true,
      headFullName: true,
      sections: true,
    },
  });

  if (!unit) {
    return [];
  }

  const recipientIds = new Set<string>();
  const unitHeadId = await resolveStructuralUnitHeadUserId(prisma, unit);

  if (unitHeadId && !excluded.has(unitHeadId)) {
    recipientIds.add(unitHeadId);
  }

  if (sectionId) {
    const section = readSections(unit.sections).find((item) => item.id === sectionId);

    if (section) {
      const sectionHeadId = await resolveSectionHeadUserId(prisma, unit.id, section);

      if (sectionHeadId && !excluded.has(sectionHeadId)) {
        recipientIds.add(sectionHeadId);
      }
    }
  }

  return [...recipientIds];
}

export async function isSingleApplicationHeadRecipient(
  prisma: PrismaService,
  application: {
    recipientUserIds?: unknown;
    submissionMode?: string | null;
    structuralUnitIds: unknown;
    structuralUnitSectionId?: string | null;
  },
  userId: string,
): Promise<boolean> {
  const explicitRecipients = normalizeRecipientUserIds(application.recipientUserIds);

  if (explicitRecipients.length > 0) {
    return explicitRecipients.includes(userId);
  }

  if (normalizeSubmissionMode(application.submissionMode) !== 'single') {
    return false;
  }

  const recipientIds = await resolveApplicationIncomingRecipientUserIds(
    prisma,
    application,
  );

  return recipientIds.includes(userId);
}

export async function validateSingleApplicationSection(
  prisma: PrismaService,
  unitId: string,
  sectionId: string | null,
): Promise<{ ok: true } | { ok: false; reason: 'unit' | 'section_required' | 'section_invalid' }> {
  const unit = await prisma.structuralUnit.findUnique({
    where: { id: unitId },
    select: { id: true, sections: true },
  });

  if (!unit) {
    return { ok: false, reason: 'unit' };
  }

  const sections = readSections(unit.sections);

  if (sections.length === 0) {
    return sectionId ? { ok: false, reason: 'section_invalid' } : { ok: true };
  }

  if (!sectionId) {
    return { ok: false, reason: 'section_required' };
  }

  return sections.some((section) => section.id === sectionId)
    ? { ok: true }
    : { ok: false, reason: 'section_invalid' };
}
