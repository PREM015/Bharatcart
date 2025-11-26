import { PrismaClient } from '@prisma/client';

export async function seedaddresses(prisma: PrismaClient) {
  console.log('Seeding addresses...');

  const data = [
    // Add seed data
  ];

  for (const item of data) {
    await prisma.addresses.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log(`✅ Seeded ${data.length} addresses(s)`);
}
