import { PrismaClient } from '@prisma/client';

export async function seedwishlists(prisma: PrismaClient) {
  console.log('Seeding wishlists...');

  const data = [
    // Add seed data
  ];

  for (const item of data) {
    await prisma.wishlists.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log(`✅ Seeded ${data.length} wishlists(s)`);
}
