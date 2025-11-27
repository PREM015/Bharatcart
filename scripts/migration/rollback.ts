/**
 * Migration Rollback
 * Purpose: Reverts database migrations safely
 * Description: Rolls back to previous migration version
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function rollback() {
  console.log('🔄 Rolling back migration...');

  try {
    // Get current migration
    const migrations = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
    });

    console.log('Current migrations status:');
    console.log(migrations);

    // Confirm rollback
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('Are you sure you want to rollback? (yes/no): ', (answer: string) => {
      if (answer.toLowerCase() === 'yes') {
        // Create backup before rollback
        console.log('📦 Creating backup...');
        execSync('npm run db:backup');

        // Rollback migration
        console.log('⏮️  Rolling back...');
        execSync('npx prisma migrate resolve --rolled-back [migration-name]');

        console.log('✅ Rollback complete!');
      } else {
        console.log('❌ Rollback cancelled');
      }
      readline.close();
    });
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

rollback()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
