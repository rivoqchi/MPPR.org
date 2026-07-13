import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { tabelNumber: null },
    orderBy: { createdAt: 'asc' },
  });

  let counter = 1;

  for (const user of users) {
    const preferred =
      user.phone === '+998947932005'
        ? '00001'
        : String(counter).padStart(5, '0');

    let tabelNumber = preferred;

    while (
      await prisma.user.findUnique({
        where: { tabelNumber },
      })
    ) {
      counter += 1;
      tabelNumber = String(counter).padStart(5, '0');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { tabelNumber },
    });

    counter += 1;
    console.log(`Updated ${user.phone} -> ${tabelNumber}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
