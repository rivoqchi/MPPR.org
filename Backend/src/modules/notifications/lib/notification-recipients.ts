import { PrismaService } from '../../../shared/prisma/prisma.service';

export async function findUsersByStructuralUnitIds(
  prisma: PrismaService,
  unitIds: string[],
  excludeUserIds: string[] = [],
): Promise<string[]> {
  if (unitIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      structuralUnitId: { in: unitIds },
      id: { notIn: excludeUserIds },
    },
    select: { id: true },
  });

  return users.map((user) => user.id);
}

export async function findUsersByRoleId(prisma: PrismaService, roleId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { roleId },
    select: { id: true },
  });

  return users.map((user) => user.id);
}
