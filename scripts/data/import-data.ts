/**
 * Data Import Tool
 * Purpose: Imports data from JSON/CSV files
 * Description: Bulk imports for seeding or migration
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function importFromJSON(filename: string, model: string) {
  console.log(`🔄 Importing from ${filename}...`);

  const data = JSON.parse(readFileSync(filename, 'utf-8'));

  for (const record of data) {
    await (prisma as any)[model].create({ data: record });
  }

  console.log(`✅ Imported ${data.length} records`);
}

async function importFromCSV(filename: string, model: string) {
  console.log(`🔄 Importing from ${filename}...`);

  const fileContent = readFileSync(filename, 'utf-8');
  const records = parse(fileContent, { columns: true });

  for (const record of records) {
    await (prisma as any)[model].create({ data: record });
  }

  console.log(`✅ Imported ${records.length} records`);
}

async function main() {
  const filename = process.argv[2];
  const model = process.argv[3];

  if (!filename || !model) {
    console.error('Usage: npm run import <filename> <model>');
    process.exit(1);
  }

  if (filename.endsWith('.json')) {
    await importFromJSON(filename, model);
  } else if (filename.endsWith('.csv')) {
    await importFromCSV(filename, model);
  } else {
    console.error('Unsupported file format. Use .json or .csv');
    process.exit(1);
  }

  console.log('✅ Import complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
