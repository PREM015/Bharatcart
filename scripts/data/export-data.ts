/**
 * Data Export Tool
 * Purpose: Exports database data to JSON/CSV
 * Description: Creates backup exports for migration or analysis
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { stringify } from 'csv-stringify/sync';

const prisma = new PrismaClient();

async function exportToJSON(table: string, data: any[]) {
  const filename = `./exports/${table}-${Date.now()}.json`;
  writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Exported ${data.length} records to ${filename}`);
}

async function exportToCSV(table: string, data: any[]) {
  if (data.length === 0) return;

  const filename = `./exports/${table}-${Date.now()}.csv`;
  const csv = stringify(data, { header: true });
  writeFileSync(filename, csv);
  console.log(`✅ Exported ${data.length} records to ${filename}`);
}

async function main() {
  console.log('🔄 Starting data export...
');

  // Export products
  const products = await prisma.product.findMany();
  await exportToJSON('products', products);
  await exportToCSV('products', products);

  // Export users (anonymized)
  const users = await prisma.user.findMany({
    select: { id: true, email: true, createdAt: true },
  });
  await exportToJSON('users', users);
  await exportToCSV('users', users);

  // Export orders
  const orders = await prisma.order.findMany({
    include: { items: true },
  });
  await exportToJSON('orders', orders);

  console.log('
✅ Export complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
