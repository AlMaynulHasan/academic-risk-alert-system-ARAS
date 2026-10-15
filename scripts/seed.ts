/**
 * CLI Runner for Synthetic Database Seeding
 * Run with: npx tsx scripts/seed.ts
 */

import { seedSyntheticDatabase } from '../src/shared/firebase/seed';

async function main() {
  console.log('Seeding synthetic database...');
  try {
    const result = await seedSyntheticDatabase();
    console.log('Result:', result.message);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

main();
