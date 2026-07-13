import { PrismaService } from '../../../shared/prisma/prisma.service';

interface StructuralUnitHeadSource {
  id: string;
  headUserId: string | null;
  headFullName: string;
}

function normalizeFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().toLowerCase();
}

export async function resolveStructuralUnitHeadUserId(
  prisma: PrismaService,
  unit: StructuralUnitHeadSource,
): Promise<string | null> {
  if (unit.headUserId) {
    const linkedHead = await prisma.user.findUnique({
      where: { id: unit.headUserId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (linkedHead) {
      const normalizedHeadName = unit.headFullName.trim().toLowerCase();
      const linkedHeadName = normalizeFullName(linkedHead.firstName, linkedHead.lastName);

      if (!normalizedHeadName || linkedHeadName === normalizedHeadName) {
        return linkedHead.id;
      }
    }
  }

  const normalizedHeadName = unit.headFullName.trim().toLowerCase();

  if (!normalizedHeadName) {
    return null;
  }

  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true },
  });

  const match = users.find(
    (user) => normalizeFullName(user.firstName, user.lastName) === normalizedHeadName,
  );

  if (!match) {
    return null;
  }

  if (unit.headUserId !== match.id) {
    await prisma.structuralUnit.update({
      where: { id: unit.id },
      data: {
        headUserId: match.id,
        headFullName: `${match.firstName} ${match.lastName}`.trim(),
      },
    });
  }

  return match.id;
}
