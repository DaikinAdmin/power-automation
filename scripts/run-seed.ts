#!/usr/bin/env tsx

import { seedFromExcel } from './seed-from-excel';
import * as path from 'path';
import * as fs from 'fs';

/**
 * CLI script to seed the database from an Excel file
 * 
 * Usage:
 *   npm run seed:excel -- <excel-file-path> <warehouse-id> [locale]
 *   
 * Examples:
 *   npm run seed:excel -- ./data.xlsx warehouse-1 ua
 *   npm run seed:excel -- ./public/sample-data/items_sample.xlsx warehouse-1 pl
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('\n❌ Error: Missing required arguments\n');
    console.log('Usage:');
    console.log('  npm run seed:excel -- <excel-file-path> <warehouse-id> [locale]\n');
    console.log('Examples:');
    console.log('  npm run seed:excel -- ./data.xlsx warehouse-1 ua');
    console.log('  npm run seed:excel -- ./public/sample-data/items_sample.xlsx warehouse-1 pl\n');
    process.exit(1);
  }
  
  const [excelFilePath, warehouseId, locale = 'ua'] = args;
  
  // Resolve file path
  const absolutePath = path.isAbsolute(excelFilePath)
    ? excelFilePath
    : path.resolve(process.cwd(), excelFilePath);
  
  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`\n❌ Error: File not found: ${absolutePath}\n`);
    process.exit(1);
  }
  
  // Check if file is Excel
  if (!absolutePath.match(/\.(xlsx|xls)$/i)) {
    console.error(`\n❌ Error: File must be an Excel file (.xlsx or .xls)\n`);
    process.exit(1);
  }
  
  try {
    await seedFromExcel(absolutePath, warehouseId, locale);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
