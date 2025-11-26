import { PrismaClient } from '@prisma/client';

export async function seedsettings(prisma: PrismaClient) {
  console.log('Seeding settings...');

  const data = [
    // Add seed data
  ];

  for (const item of data) {
    await prisma.settings.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log(`✅ Seeded ${data.length} settings(s)`);
}
