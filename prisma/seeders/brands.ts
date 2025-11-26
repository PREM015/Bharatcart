import { PrismaClient } from '@prisma/client';

export async function seedbrands(prisma: PrismaClient) {
  console.log('Seeding brands...');

  const data = [
    // Add seed data
  ];

  for (const item of data) {
    await prisma.brands.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log(`✅ Seeded ${data.length} brands(s)`);
}
