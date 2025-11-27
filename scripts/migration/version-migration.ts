/**
 * Version Migration
 * Purpose: Upgrades data schemas between versions
 * Description: Handles breaking changes when upgrading
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToV2() {
  console.log('🔄 Migrating to version 2.0.0...');

  // Example: Add new fields to existing records
  await prisma.user.updateMany({
    where: { emailVerified: null },
    data: { emailVerified: false },
  });

  // Example: Migrate old cart structure
  const oldCarts = await prisma.$queryRaw`
    SELECT * FROM old_carts WHERE migrated = false
  `;

  for (const oldCart of oldCarts as any[]) {
    await prisma.cart.create({
      data: {
        userId: oldCart.user_id,
        items: {
          create: JSON.parse(oldCart.items).map((item: any) => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
        },
      },
    });

    // Mark as migrated
    await prisma.$executeRaw`
      UPDATE old_carts SET migrated = true WHERE id = ${oldCart.id}
    `;
  }

  console.log('✅ Migration to v2.0.0 complete!');
}

async function main() {
  const targetVersion = process.argv[2];

  switch (targetVersion) {
    case 'v2':
      await migrateToV2();
      break;
    default:
      console.error('Unknown version. Available: v2');
      process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
