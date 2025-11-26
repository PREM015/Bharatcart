import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Import and run seeders
  const { seedUsers } = await import('./users');
  const { seedProducts } = await import('./products');
  const { seedCategories } = await import('./categories');
  const { seedOrders } = await import('./orders');
  const { seedReviews } = await import('./reviews');

  await seedUsers(prisma);
  await seedProducts(prisma);
  await seedCategories(prisma);
  await seedOrders(prisma);
  await seedReviews(prisma);

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
