import { PrismaClient } from '@prisma/client';

export async function seedcoupons(prisma: PrismaClient) {
  console.log('Seeding coupons...');

  const data = [
    // Add seed data
  ];

  for (const item of data) {
    await prisma.coupons.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log(`✅ Seeded ${data.length} coupons(s)`);
}
