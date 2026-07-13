import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SYSTEM_ADMIN_ROLE_ID = 'system-admin-role';
const DEFAULT_STRUCTURAL_UNIT_ID = 'default-structural-unit';
const DEFAULT_ADMIN_ID = 'default-admin';

const PERMISSION_PAGE_KEYS = [
  '/',
  '/guide',
  '/settings',
  '/applications/submit',
  '/applications/incoming',
  '/applications/calendar',
  '/ppr-calendar',
  '/registration/ppr-type',
  '/registration/structural-units',
  '/registration/objects',
  '/management/users',
  '/management/roles',
  '/profile',
];

function createFullPagePermissions() {
  return PERMISSION_PAGE_KEYS.map((pageKey) => ({
    pageKey,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  }));
}

async function main() {
  const password = await bcrypt.hash('123123', 12);

  await prisma.appRole.upsert({
    where: { id: SYSTEM_ADMIN_ROLE_ID },
    update: {},
    create: {
      id: SYSTEM_ADMIN_ROLE_ID,
      name: 'Admin',
      description: 'Tizim administratori',
      documents: [],
      permissions: createFullPagePermissions(),
      canViewAllStructuralUnits: true,
      isSystem: true,
    },
  });

  await prisma.structuralUnit.upsert({
    where: { id: DEFAULT_STRUCTURAL_UNIT_ID },
    update: {},
    create: {
      id: DEFAULT_STRUCTURAL_UNIT_ID,
      originalName: 'Bosh boshqarma',
      shortName: 'BB',
      headFullName: 'Administrator',
      documents: [],
    },
  });

  const admin = await prisma.user.upsert({
    where: { phone: '+998947932005' },
    update: {
      tabelNumber: '00001',
      withoutSectionAccess: true,
    },
    create: {
      id: DEFAULT_ADMIN_ID,
      firstName: 'Admin',
      lastName: 'MPPR',
      birthDate: '1990-01-01',
      phone: '+998947932005',
      tabelNumber: '00001',
      position: 'Administrator',
      roleId: SYSTEM_ADMIN_ROLE_ID,
      structuralUnitId: DEFAULT_STRUCTURAL_UNIT_ID,
      withoutSectionAccess: true,
      password,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'system',
        title: 'Welcome',
        message: 'Welcome to PPR.org API',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
