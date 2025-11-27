/**
 * Database Performance Tests
 * Purpose: Measures database query performance
 * Description: Tests read/write speeds, connection pooling
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

async function measureQuery(name: string, queryFn: () => Promise<any>) {
  const start = performance.now();
  await queryFn();
  const end = performance.now();
  const duration = end - start;

  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return duration;
}

async function main() {
  console.log('🔄 Running database benchmarks...
');

  // Read queries
  await measureQuery('Find single product', () =>
    prisma.product.findUnique({ where: { id: 1 } })
  );

  await measureQuery('Find 100 products', () =>
    prisma.product.findMany({ take: 100 })
  );

  await measureQuery('Complex join query', () =>
    prisma.order.findMany({
      take: 50,
      include: {
        items: { include: { product: true } },
        user: true,
      },
    })
  );

  // Write queries
  await measureQuery('Insert single record', async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        name: 'Test User',
      },
    });
    await prisma.user.delete({ where: { id: user.id } });
  });

  // Batch operations
  await measureQuery('Batch insert 100 records', async () => {
    const data = Array.from({ length: 100 }, (_, i) => ({
      email: `batch-${Date.now()}-${i}@test.com`,
      name: `Batch User ${i}`,
    }));
    const users = await prisma.user.createMany({ data });
    await prisma.user.deleteMany({
      where: { email: { startsWith: `batch-${Date.now()}` } },
    });
  });

  console.log('
✅ Benchmarks complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
