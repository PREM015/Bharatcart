/**
 * Data Anonymization
 * Purpose: Removes PII from database for testing/development
 * Description: Replaces sensitive data with fake data
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function anonymizeUsers() {
  console.log('🔄 Anonymizing user data...');

  const users = await prisma.user.findMany();

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        phone: faker.phone.number(),
      },
    });
  }

  console.log(`✅ Anonymized ${users.length} users`);
}

async function anonymizeOrders() {
  console.log('🔄 Anonymizing order data...');

  const orders = await prisma.order.findMany({
    include: { shippingAddress: true },
  });

  for (const order of orders) {
    if (order.shippingAddress) {
      await prisma.address.update({
        where: { id: order.shippingAddress.id },
        data: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          postalCode: faker.location.zipCode(),
          phone: faker.phone.number(),
        },
      });
    }
  }

  console.log(`✅ Anonymized ${orders.length} orders`);
}

async function main() {
  console.log('🔒 Starting data anonymization...
');

  await anonymizeUsers();
  await anonymizeOrders();

  console.log('
✅ Anonymization complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
