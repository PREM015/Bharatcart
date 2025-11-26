import { PrismaClient } from '@prisma/client';

export async function seedbanners(prisma: PrismaClient) {
  console.log('Seeding banners...');

  const data = [
    // Add seed data
  ];

  for (const item of data) {
    await prisma.banners.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log(`✅ Seeded ${data.length} banners(s)`);
}
